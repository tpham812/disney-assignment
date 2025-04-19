const http = require('http');

const PORT = 8901;
const DATABASE_SIZE = 20000;

//Number of shards
const SHARD_SIZE = 10;
//Number of list items per shard (potentially excluding the last shard if shard size is a multiple of database size. Essentially no remainder)
const LIST_SIZE = Math.floor(DATABASE_SIZE / SHARD_SIZE);

//2D array. Initialized later on.
const orderedList = new Array(SHARD_SIZE);


initializeOrderedList = () => {

    //Initialize Ordered list by instantiating a new array for each index excluding the last
    for(let i = 0; i < SHARD_SIZE - 1; i++) {
        orderedList[i] = new Array(LIST_SIZE);
    }
    //If shard size is not a multple of database size then instantiate an array of size(DATABASE_SIZE % SHARD_SIZE) for the last index
    if(DATABASE_SIZE % SHARD_SIZE !== 0) {
        orderedList[SHARD_SIZE - 1] = new Array(DATABASE_SIZE % SHARD_SIZE);
    } else {
        orderedList[SHARD_SIZE - 1] = new Array(LIST_SIZE);
    }
   
}

// The "database" is simply an ordered list of media chunk metadata objects.
//const orderedList = [];

// Create fake media segment data and populate the database with the results.
// (The "database" is simply an ordered list in memory above.)
function createFakeMediaSegmentsData() {
    // Initialize the media timeline cursor
    let timelineCursor = Date.now();
    const maxDuration = 10000;
    const minDuration = 5000;

    for (let i = 0; i < DATABASE_SIZE; i++) {
        const duration = Math.round(Math.random() * (maxDuration - minDuration) + minDuration);
        //Calculate shard index from the requested index
        const shard = Math.floor(i / LIST_SIZE);
        //Calculate list index from requested index
        const listIndx = i % LIST_SIZE;
        orderedList[shard][listIndx] = {
            duration,
            start: timelineCursor,
            end: timelineCursor + duration,
            index: i,
        }
        timelineCursor += duration;
    }
}


const server = http.createServer((req, res) => {
    const base = `http://localhost:${server.address().port}`;
    const url = new URL(req.url, base);

    const response = { result: null };
    let status = 404;

    if (url.pathname === '/range') {
        status = 200;
        //Last shard index
        const lastShard = orderedList.length-1;
        response.result = {
            //Start time of first segment in ordered list
            start: orderedList[0][0].start,
            ///End time of last segmenet in ordered list
            end: orderedList[lastShard][orderedList[lastShard].length - 1].end,
            //Total segments in ordered list
            length: DATABASE_SIZE,
        };
    } else if (url.pathname === '/query') {
        const index = parseInt(url.searchParams.get('index'), 10);

        //Calculate shard index from the requested index
        const shard = Math.floor(index / LIST_SIZE);
        //Calculate list index from requested index
        const listIndx = index % LIST_SIZE;

        const result = orderedList[shard][listIndx] || null;

        if (result) {
            status = 200;
        }

        response.result = result;
    } else {
        response.result = null;
    }

    const message = JSON.stringify(response);

    // Simulate disk and network work loads with a timeout.
    setTimeout(() => {
        res.writeHead(status, {
            'content-type': 'application/json',
            'content-length': Buffer.byteLength(message),
        });

        res.end(message);
    }, 10);
});

server.on('listening', () => {
    const { port } = server.address();
    console.log('Database server listening on port', port);
});

initializeOrderedList();
// Seed the database and start the server.
createFakeMediaSegmentsData();
server.listen(PORT);
