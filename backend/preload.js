// backend/preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  solana: {
    mintNFT: (params) => ipcRenderer.invoke('mint-nft', params),
    // Add other Solana methods as needed
  }
});
