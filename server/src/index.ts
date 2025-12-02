import 'dotenv/config';
import express from 'express';
import { Request, Response, Router, NextFunction } from 'express';
import * as admin from 'firebase-admin';
import { DocumentReference, CollectionReference } from '@google-cloud/firestore';

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

interface AuthRequest extends Request {
    userId?: string;
}

// verify Firebase ID token from authentication header: https://firebase.google.com/docs/auth/admin/verify-id-tokens
async function authenticate(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    const authHeader = req.headers.authorization;
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

// controllor
async function createPost(req: AuthRequest, res: Response): Promise<void> {
    const { courseId, title, content, tags } = req.body;
    const authorId = req.userId;

    if (!courseId || !title || !content || !authorId) {
        res.status(400).json({ error: "Missing required post fields! (courseId, title, content)." });
        return;
    }

    try {
        // 1. reference the public posts collection for the specific course
        const postsCollectionRef: CollectionReference = getPublicDataRoot()
            .collection('courses').doc(courseId)
            .collection('posts');

        // 2. define the new post document structure
        const newPost = {
            author_id: authorId,
            course_id: courseId,
            title,
            content,
            tags: Array.isArray(tags) ? tags : [],
            vote_score: 0,
            comment_count: 0,
            created_at: admin.firestore.FieldValue.serverTimestamp(),
        };

        // 3. write the document to firestore
        const postRef = await postsCollectionRef.add(newPost);

        // 4. success response
        res.status(201).json({
            message: 'Post created successfully',
            postId: postRef.id,
        });

    } catch (e) {
        console.error("Error creating post:", e);
        res.status(500).json({ error: 'Server failed to create post.' });
    }
}

app.use(express.json());

const postsRouter: Router = express.Router();
postsRouter.post('/', authenticate, createPost);
app.use('/api/posts', postsRouter);

// public route
app.get('/', (req: Request, res: Response) => {
    res.send('welcome to town square backend!');
});

// start server
const server = app.listen(PORT, () => {
    console.log(`server successful on http://localhost:${PORT}`);
});

// error checking
// server.on('error', (error) => {
//     console.error('Server error:', error);
// });