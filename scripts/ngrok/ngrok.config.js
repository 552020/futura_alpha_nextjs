// ngrok configuration for UploadThing development
module.exports = {
  // Your static ngrok domain
  ngrokUrl: 'https://theological-damion-unpatronizing.ngrok-free.app',
  
  // Environment variables to set
  env: {
    NEXT_PUBLIC_NGROK_URL: 'https://theological-damion-unpatronizing.ngrok-free.app',
    NODE_ENV: 'development'
  }
};
