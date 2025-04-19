exports.name = 'custom';

const histories = {};


const toBeat = {
    'rock': 'paper',
    'paper': 'scissors',
    'scissors': 'rock'
}


exports.recordShot = (playerId, shot) => {
    histories[playerId] = shot;
};

exports.makeShot = (playerId) => {
    if(!histories[playerId]) {
        return 'rock'
    }
    return toBeat[histories[playerId]];
};
