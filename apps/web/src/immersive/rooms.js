export const roomManifest = {
  archive: {
    id: 'archive',
    label: 'Arsip waktu',
    scopeLabel: 'Ruang imajinatif untuk menjelajahi sejarah',
    modelUrl: '/history/archive/room.glb',
    posterUrl: '/history/archive/poster.webp',
    camera: { position: [7, 6, 10], target: [0, 1.6, -1], yawLimit: 0.45, pitchLimit: 0.2 },
    objects: [
      {
        id: 'instrument', label: 'Instrumen waktu',
        description: 'Instrumen rekaan ini menjadi penanda perjalanan kita. Bentuk lingkarannya mengajak kita melihat kembali peristiwa dari sudut pandang yang berbeda; ini bukan artefak sejarah.',
        view: { position: [3, 3.4, 4], target: [0, 1.7, 0] },
      },
      {
        id: 'map', label: 'Meja penjelajah',
        description: 'Sebuah tempat untuk membaca, membandingkan, dan bertanya. Lembaran di meja ini adalah dekorasi ruang arsip, bukan peta atau dokumen sejarah asli.',
        view: { position: [2, 3.7, 4], target: [0, 1, 0] },
      },
      {
        id: 'cabinet', label: 'Koleksi arsip',
        description: 'Rak-rak ini membingkai ruang belajar imajinatif. Saat menelusuri masa lalu, bedakan sumber asli, penafsiran, dan rekonstruksi seperti ruangan yang sedang kamu lihat.',
        view: { position: [1, 2.8, 4], target: [-3, 2, -3] },
      },
    ],
  },
  'ww1-field-station': {
    id: 'ww1-field-station',
    label: 'Pos komunikasi · 1914–1918',
    scopeLabel: 'Ilustrasi Front Barat; bukan rekonstruksi lokasi cerita',
    modelUrl: '/history/ww1-field-station/room.glb',
    posterUrl: '/history/ww1-field-station/poster.webp',
    camera: { position: [7, 6, 10], target: [0, 1.6, -1], yawLimit: 0.4, pitchLimit: 0.2 },
    objects: [
      {
        id: 'telephone', label: 'Telepon lapangan',
        description: 'Komunikasi membantu menghubungkan pos-pos yang terpisah. Telepon lapangan menjadi salah satu sarana komunikasi pada Perang Dunia I. Model ini adalah ilustrasi, bukan salinan alat tertentu.',
        view: { position: [1, 2.4, 3], target: [-1, 1.2, -1] },
      },
      {
        id: 'dispatch', label: 'Meja pesan',
        description: 'Pesan dan laporan membantu orang memahami keadaan di luar pos mereka. Lembaran di sini hanya menggambarkan suasana meja kerja; tidak memuat dokumen atau perintah asli.',
        view: { position: [2, 3, 2], target: [0, 1, -1] },
      },
      {
        id: 'supplies', label: 'Perlengkapan pos',
        description: 'Di balik peristiwa besar, ada kebutuhan sehari-hari: tempat berlindung, penerangan, dan perlengkapan. Rak ini mengajak kita memperhatikan kehidupan manusia di dalam sejarah.',
        view: { position: [0, 2, 2], target: [2.5, 1.5, -2] },
      },
    ],
  },
  'ww2-radio-room': {
    id: 'ww2-radio-room',
    label: 'Ruang radio · 1939–1945',
    scopeLabel: 'Ilustrasi kehidupan sipil Inggris; bukan lokasi cerita',
    modelUrl: '/history/ww2-radio-room/room.glb',
    posterUrl: '/history/ww2-radio-room/poster.webp',
    camera: { position: [7, 6, 10], target: [0, 1.6, -1], yawLimit: 0.4, pitchLimit: 0.18 },
    objects: [
      {
        id: 'radio', label: 'Penerima radio',
        description: 'Radio membawa berita dan suara ke dalam rumah. Ruangan ini membayangkan pengalaman mendengarkan pada masa perang; tidak ada siaran atau suara tokoh asli yang diputar.',
        view: { position: [1.5, 2.4, 3], target: [0, 1.3, -1.5] },
      },
      {
        id: 'curtain', label: 'Tirai gelap',
        description: 'Dalam blackout di Inggris, cahaya dari bangunan dibatasi agar tidak terlihat dari luar. Tirai gelap ini mengingatkan bahwa perang juga mengubah kebiasaan hidup di rumah.',
        view: { position: [0, 2.5, 3], target: [-2.5, 2, -2] },
      },
      {
        id: 'shelf', label: 'Sudut rumah',
        description: 'Benda rumah tangga memberi ruang untuk membicarakan pengalaman warga sipil. Ruangan ini merupakan ilustrasi yang disusun untuk belajar, bukan rumah seseorang yang didokumentasikan.',
        view: { position: [0, 2, 2], target: [2.5, 1.5, -2] },
      },
    ],
  },
};
