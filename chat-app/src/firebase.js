  import { initializeApp } from 'firebase/app';
  import { getAuth } from 'firebase/auth';
  import { getFirestore } from 'firebase/firestore';
  import { getStorage } from 'firebase/storage';

  const firebaseConfig = {
    apiKey: 'AIzaSyAqamZC-RfEg_juSSYjaJcGNtCfjOxqwQE',
    authDomain: 'chatapp-227e4.firebaseapp.com',
    projectId: 'chatapp-227e4',
    storageBucket: 'chatapp-227e4.appspot.com',
    messagingSenderId: '331422036869',
    appId: '1:331422036869:web:13041fcc074f267a32caec',
    measurementId: 'G-LM2SE9B6JX'
  };

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);
  const storage = getStorage(app);

  export { app, auth, db, storage };