import { GlobalRegistrator } from "@happy-dom/global-registrator";
if (!GlobalRegistrator.isRegistered)
  GlobalRegistrator.register({ url: "http://localhost:5173" });
import React from "react";
import { afterEach, expect, mock, test } from "bun:test";
import { act, cleanup, render } from "@testing-library/react";

let parse;
const originalFetch = globalThis.fetch;
const TestLoader = class {
  parseAsync() {
    return parse();
  }
};
import RoomModel from "../RoomModel.jsx";

afterEach(() => {
  cleanup();
  globalThis.fetch = originalFetch;
});

test("late parsing completion after unmount disposes its resources without signalling readiness", async () => {
  let finish;
  let parsingStarted;
  const started = new Promise((resolve) => {
    parsingStarted = resolve;
  });
  const disposed = mock();
  parse = () => {
    parsingStarted();
    return new Promise((resolve) => {
      finish = resolve;
    });
  };
  const fetchMock = mock(() => ({
    ok: true,
    arrayBuffer: () => new ArrayBuffer(0),
  }));
  globalThis.fetch = fetchMock;
  const ready = mock();
  const failed = mock();
  let view;
  await act(async () => {
    view = render(
      <RoomModel
        loader={TestLoader}
        url="http://localhost:5173/history/archive/room.glb"
        onReady={ready}
        onError={failed}
      />,
    );
  });
  expect(fetchMock).toHaveBeenCalledTimes(1);
  await started;
  expect(finish).toBeFunction();
  view.unmount();
  await act(async () =>
    finish({
      scene: {
        traverse: (visit) => visit({ geometry: { dispose: disposed } }),
      },
    }),
  );
  expect(disposed).toHaveBeenCalledTimes(1);
  expect(ready).not.toHaveBeenCalled();
  expect(failed).not.toHaveBeenCalled();
});

test("HTTP failures call fallback without reporting a ready model", async () => {
  globalThis.fetch = mock(async () => ({ ok: false, status: 404 }));
  const failed = mock();
  const ready = mock();
  await act(async () =>
    render(
      <RoomModel
        loader={TestLoader}
        url="http://localhost:5173/history/archive/room.glb"
        onReady={ready}
        onError={failed}
      />,
    ),
  );
  expect(failed).toHaveBeenCalledTimes(1);
  expect(ready).not.toHaveBeenCalled();
});
