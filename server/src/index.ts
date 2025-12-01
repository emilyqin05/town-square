import express from 'express';
import { Request, Response } from 'express';

const app = express();
const PORT = 3001;

app.get('/', (req: Request, res: Response) => {
    res.send('testing backend');
});

const server = app.listen(PORT, () => {
    console.log(`server successful on http://localhost:${PORT}`);
});

// error checking
// server.on('error', (error) => {
//     console.error('Server error:', error);
// });