const http = require('http');

const DB_PORT = 8901;
const PORT = 8902;

// When we discover the length of the ordered list from the DB, we stash it here.
let knownListLength;

function sendJSONResponse(res, status, response) {
    const message = JSON.stringify(response);

    res.writeHead(status, {
        'content-type': 'application/json',
        'content-length': Buffer.byteLength(message),
    });

    res.end(message);
}

function makeDatabaseRequest(pathname, callback) {
    http.get(`http://localhost:${DB_PORT}${pathname}`, (dbResponse) => {
        dbResponse.setEncoding('utf8');

        let rawUTF8 = '';

        dbResponse.on('data', (chunk) => {
            rawUTF8 += chunk;
        });

        dbResponse.on('end', () => {
            callback(JSON.parse(rawUTF8));
        });
    });
}

function findSegment(res, knownLength, position) {

    function tryNext(left, right) {
        if(left > right) {
            return sendJSONResponse(res, 404, {});
        }
        //get middle index and try query
        const mid = left + ((right - left) >> 1);
        makeDatabaseRequest(`/query?index=${mid}`, (data) => {
            const { result } = data;
           if (result.start <= position && position <= result.end) {
                return sendJSONResponse(res, 200, data);
            }
            //if not found and position is less than start then update window to left: mid + 1, right: right
            if(position > result.end) {
                tryNext(mid + 1, right);
            }
            //if not found and position is not less than start then update window to left: left, right: mid - 1
            else {
                tryNext(left, mid - 1);
            }
        });
    }
    tryNext(0, knownLength - 1);
}

function getRange(res) {
    console.log('get range from database ordered list');

    makeDatabaseRequest('/range', (data) => {
        const { length } = data.result;

        knownListLength = length;

        sendJSONResponse(res, 200, data);
    });
}

const server = http.createServer((req, res) => {
    const base = `http://localhost:${server.address().port}`;
    const url = new URL(req.url, base);

    const response = { result: null };
    let status = 404;

    if (url.pathname === '/range') {
        return getRange(res);
    }

    if (url.pathname === '/media-segment') {
        const position = parseInt(url.searchParams.get('position'), 10);
        console.log('get media segment for position', position);

        if (!Number.isNaN(position)) {
            return findSegment(res, knownListLength, position);
        }
    }

    sendJSONResponse(res, status, response);
});

server.on('listening', () => {
    const { port } = server.address();
    console.log('Application server listening on port', port);
});

server.listen(PORT);
