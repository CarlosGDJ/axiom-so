export const productionFirebaseConfig = {
  projectId: 'studio-3117940434-1668c',
  appId: '1:906735612178:web:d38c3fdcbe29ec470703cb',
  apiKey: 'AIzaSyBxuDTpmEw9MB00Z7ZWvpgc0upFBnDvZa8',
  authDomain: 'studio-3117940434-1668c.firebaseapp.com',
  measurementId: '',
  messagingSenderId: '906735612178',
};

export const emulatorFirebaseConfig = {
  projectId: 'demo-sandbox',
  appId: '1:1234567890:web:abcdef123456',
  apiKey: 'fake-api-key',
  authDomain: 'demo-sandbox.firebaseapp.com',
  storageBucket: 'demo-sandbox.appspot.com',
  measurementId: '',
  messagingSenderId: '1234567890',
};

export const firebaseConfig =
  process.env.NEXT_PUBLIC_USE_EMULATOR === 'true'
    ? emulatorFirebaseConfig
    : productionFirebaseConfig;
