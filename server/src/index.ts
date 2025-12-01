import 'dotenv/config';
import express from 'express';
import { Request, Response, Router, NextFunction } from 'express';
import * as admin from 'firebase-admin';
import { DocumentReference } from '@google-cloud/firestore';

const app = express();
const PORT = 3001;
// runtime variables
declare const __app_id: string;
declare const __firebase_config: string;

if (typeof __firebase_config !== 'undefined') {
    const firebaseConfig = JSON.parse(__firebase_config);
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: firebaseConfig.projectId,
        }),
    });
    console.log("Firebase Admin SDK initialized using Canvas config.");
} else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    admin.initializeApp({
        credential: admin.credential.applicationDefault()
    });
    console.log("Firebase Admin SDK initialized using GOOGLE_APPLICATION_CREDENTIALS.");
} else {
    console.warn("WARNING: Firebase Admin SDK not fully initialized (missing credentials).");
}

const db = admin.firestore();

function getPublicDataRoot(): DocumentReference {
    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
    // Path: /artifacts/{appId}/public/data
    return db.collection('artifacts').doc(appId).collection('public').doc('data');
}

function getPrivateUserRoot(userId: string): DocumentReference {
    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
    // Path: /artifacts/{appId}/users/{userId}
    return db.collection('artifacts').doc(appId).collection('users').doc(userId);
}

// ADDED: Interface to augment the Express Request object
interface AuthRequest extends Request {
    userId?: string; // This is where the authenticated UID will be stored
}

// verify Firebase ID token from authentication header: https://firebase.google.com/docs/auth/admin/verify-id-tokens
async function authenticate(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    const authHeader = req.headers.authorization;
    // check if the header exists and starts with 'Bearer '
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: '401: Authentication required (Missing or malformed Bearer Token).' });
        return;
    }

    const idToken = authHeader.split('Bearer ')[1];

    try {
        // verify token
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        // attach the verified UID to the request for downstream controllers
        req.userId = decodedToken.uid;
        next();
    } catch (error) {
        console.error("Token verification failed:", error);
        res.status(401).json({ error: '401: Unauthorized (Invalid or expired token).' });
    }
}

app.use(express.json());

const postsRouter: Router = express.Router();

postsRouter.get('/', (req: Request, res: Response) => {
    // This mocks the data we will eventually fetch from Firestore.
    res.status(200).json({
        message: "This is the public list of posts (Mock Data).",
        data: [
            { id: "mock-101", title: "Intro to Express", votes: 5 }
        ]
    });
});

postsRouter.post('/', authenticate, (req, res) => {
    res.status(200).json({ message: "Success! Token verified. Now waiting for Post logic." });
});

app.use('/api/posts', postsRouter);

// public route
app.get('/', (req: Request, res: Response) => {
    res.send('testing backend');
});

// start server
const server = app.listen(PORT, () => {
    console.log(`server successful on http://localhost:${PORT}`);
});

// error checking
// server.on('error', (error) => {
//     console.error('Server error:', error);
// });