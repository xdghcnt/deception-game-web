function init(wsServer, path) {
    const
        fs = require("fs"),
        express = require("express"),
        app = wsServer.app,
        registry = wsServer.users,
        channel = "deception",
        testMode = process.argv[2] === "debug";

    app.use("/deception", express.static(`${__dirname}/public`));
    if (registry.config.appDir)
        app.use("/deception", express.static(`${registry.config.appDir}/public`));

    registry.handleAppPage(path, `${__dirname}/public/app.html`);

    class GameState extends wsServer.users.RoomState {
        constructor(hostId, hostData, userRegistry) {
            super(hostId, hostData, userRegistry);
            const
                room = {
                    inited: true,
                    hostId: hostId,
                    spectators: new JSONSet(),
                    playerNames: {},
                    onlinePlayers: new JSONSet(),
                    wantMasterList: new JSONSet(),
                    prevMaster: null,
                    playerSlots: Array(12).fill(null),
                    teamsLocked: false,
                    playerAvatars: {},
                    crimeTime: 180,
                    masterTime: 180,
                    commonTime: 60,
                    personTime: 240,
                    witnessTime: 30,
                    time: null,
                    timed: true,
                    paused: true,
                    personalSpeechMode: false,
                    playerSuccess: null,
                    phase: 0,
                    round: 1,
                    master: null,
                    currentPerson: null,
                    reconTiles: [0, 1, 2, 2, 2, 2],
                    reconBullets: {},
                    speechPlayers: new JSONSet(),
                    playerShot: null,
                    cards: [],
                    crimeWin: null,
                    testMode
                },
                state = {
                    witness: null,
                    murderer: null,
                    assistant: null,
                    weapon: null,
                    clue: null,
                    crimePlan: null
                },

                deckState = {
                    weapon: [],
                    clue: [],
                    recon: []
                };
            if (testMode)
                [0, 1, 2, 3, 4, 5, 6].forEach((ind) => {
                    room.playerSlots[ind] = `kek${ind}`;
                    room.playerNames[`kek${ind}`] = `kek${ind}`;
                });
            let interval;
            this.room = room;
            this.state = state;
            this.lastInteraction = new Date();
            const
                send = (target, event, data) => userRegistry.send(target, event, data),
                update = () => send(room.onlinePlayers, "state", room),
                sendState = (user) => {
                    const slot = room.playerSlots.indexOf(user);
                    if (room.phase === 0 || room.master === slot)
                        send(user, "player-state", state);
                    else if (room.phase === 5 || state.murderer === slot || state.assistant === slot)
                        send(user, "player-state", {...state, witness: null});
                    else if (state.witness === slot)
                        send(user, "player-state", {
                            suspects: shuffleArray([state.murderer, state.assistant]),
                            witness: state.witness
                        });
                    else
                        send(user, "player-state", {})
                },
                updateState = () => [...room.onlinePlayers].forEach(sendState),
                getRandomPlayer = (exclude, allowEmptySlot) => {
                    const res = [];
                    room.playerSlots.forEach((user, slot) => {
                        if ((allowEmptySlot || user !== null) && !~exclude.indexOf(slot))
                            res.push(slot);
                    });
                    return shuffleArray(res)[0];
                },
                startGame = () => {
                    const playersCount = room.playerSlots.filter((user) => user !== null).length;
                    if (playersCount > 3) {
                        room.phase = 1;
                        room.round = 1;
                        room.teamsLocked = true;
                        room.playerSuccess = null;
                        if (room.timed)
                            room.paused = false;
                        room.crimeWin = false;
                        room.master = getRandomPlayer(room.wantMasterList.size
                            ? room.playerSlots.filter((user) => !room.wantMasterList.has(user)).map((user) => room.playerSlots.indexOf(user))
                            : [room.playerSlots.indexOf(room.prevMaster)]);
                        room.wantMasterList.clear();
                        room.playerShot = null;
                        state.assistant = null;
                        state.witness = null;
                        state.weapon = null;
                        state.clue = null;
                        state.murderer = getRandomPlayer([room.master]);
                        if (playersCount > 5) {
                            state.assistant = getRandomPlayer([room.master, state.murderer]);
                            state.witness = getRandomPlayer([room.master, state.murderer, state.assistant]);
                        }
                        room.reconTiles = [3, 4, 5, 6, 7, 2];
                        room.reconBullets = {};
                        room.cards = {};
                        if (deckState.weapon.length < playersCount * 4)
                            deckState.weapon = shuffleArray(Array(90).fill(null).map((v, index) => index));
                        if (deckState.clue.length < playersCount * 4)
                            deckState.clue = shuffleArray(Array(200).fill(null).map((v, index) => index));
                        room.cards = room.playerSlots.map((user, slot) =>
                            user !== null && slot !== room.master ? {
                                weapons: deckState.weapon.splice(0, 4),
                                clues: deckState.clue.splice(0, 4),
                                weaponsMarked: Array(4).fill(null).map(() => []),
                                cluesMarked: Array(4).fill(null).map(() => []),
                                weaponsSelected: Array(4).fill(null).map(() => []),
                                cluesSelected: Array(4).fill(null).map(() => []),
                                hasBadge: true
                            } : null
                        );
                        state.crimePlan = room.playerSlots.map((user) =>
                            user !== null && user !== room.master ? {
                                weaponsMarked: Array(4).fill(null).map(() => []),
                                cluesMarked: Array(4).fill(null).map(() => []),
                                weaponsSelected: Array(4).fill(null).map(() => []),
                                cluesSelected: Array(4).fill(null).map(() => [])
                            } : null
                        );
                        startTimer();
                    } else endGame();
                },
                startMaster = () => {
                    room.phase = 2;
                    state.crimePlan = null;
                    room.crimeWin = true;
                    deckState.recon = shuffleArray(Array(21).fill(null).map((v, index) => index + 8));
                    room.reconTiles = [3, 4].concat(deckState.recon.splice(0, 4));
                    startTimer();
                    update();
                    updateState();
                },
                startCommon = () => {
                    room.phase = 3;
                    state.crimePlan = null;
                    room.crimeWin = true;
                    room.cards.forEach((cardSlot, slot) => {
                        if (cardSlot !== null && cardSlot !== room.master)
                            room.speechPlayers.add(slot);
                    });
                    startTimer();
                },
                startPerson = () => {
                    if (room.personalSpeechMode) {
                        room.phase = 4;
                        room.cards.forEach((cardSlot, slot) => {
                            if (cardSlot !== null && cardSlot !== room.master)
                                room.speechPlayers.add(slot);
                        });
                        room.currentPerson = [...room.speechPlayers][0];
                        startTimer();
                    } else {
                        if (room.round < 3) {
                            room.round++;
                            addReconTile();
                            startCommon();
                        } else endGame();
                    }
                },
                startWitness = () => {
                    room.crimeWin = false;
                    room.currentPerson = null;
                    if (state.witness === null)
                        endGame();
                    else {
                        room.phase = 5;
                        updateState();
                        startTimer();
                    }
                },
                addReconTile = () => {
                    if (room.reconTiles.length > 6) {
                        room.reconTiles.pop();
                        delete room.reconBullets[6];
                    }
                    room.reconTiles.push(deckState.recon.shift());
                },
                nextPerson = () => {
                    room.speechPlayers.delete(room.currentPerson);
                    room.currentPerson = [...room.speechPlayers][0];
                    if (room.currentPerson)
                        startTimer();
                    else if (room.round < 3) {
                        room.round++;
                        room.currentPerson = null;
                        addReconTile();
                        startCommon();
                    }
                    else
                        endGame();
                },
                getSelectedCard = (slot, type, deselect) => {
                    let selectedCard = {};
                    (room.phase === 1 ? state.crimePlan : room.cards)
                        .some((cardSlot, cardSlotIndex) => cardSlot && cardSlot[`${type}Selected`].some((slots, cardIndex) => {
                            if (~slots.indexOf(slot)) {
                                selectedCard = {slot: cardSlotIndex, id: cardIndex};
                                if (deselect)
                                    slots.splice(slots.indexOf(slot), 1);
                                return true;
                            }
                        }));
                    return selectedCard;
                },
                startTimer = () => {
                    clearInterval(interval);
                    if (room.timed && room.phase !== 0) {
                        if (room.phase === 1)
                            room.time = room.crimeTime * 1000;
                        else if (room.phase === 2)
                            room.time = room.masterTime * 1000;
                        else if (room.phase === 3)
                            room.time = ((!room.personalSpeechMode && room.round === 3)
                                ? room.personTime
                                : room.commonTime) * 1000;
                        else if (room.phase === 4)
                            room.time = room.personTime * 1000;
                        else if (room.phase === 5)
                            room.time = room.witnessTime * 1000;
                        let time = new Date();
                        interval = setInterval(() => {
                            if (!room.paused) {
                                room.time -= new Date() - time;
                                time = new Date();
                                if (room.time <= 0) {
                                    clearInterval(interval);
                                    if (room.phase === 1)
                                        endGame();
                                    else if (room.phase === 2) {
                                        const playersCount = room.cards.filter((state) => state !== null).length + 1;
                                        if (playersCount > 4 && playersCount !== 6) {
                                            if (room.playerSlots[room.master])
                                                removePlayer(room.playerSlots[room.master]);
                                            const newMasterSlot = getRandomPlayer([room.master, state.murderer, state.assistant, state.witness], true);
                                            if (room.playerSlots[newMasterSlot] === null)
                                                endGame();
                                            room.playerSlots[room.master] = room.playerSlots[newMasterSlot];
                                            room.playerSlots[newMasterSlot] = null;
                                            room.cards[newMasterSlot] = null;
                                            room.time = room.masterTime * 1000;
                                        } else endGame();
                                    }
                                    else if (room.phase === 3)
                                        startPerson();
                                    else if (room.phase === 4)
                                        nextPerson();
                                    else if (room.phase === 5)
                                        endGame();
                                    update();
                                }
                            } else time = new Date();
                        }, 100);
                    }
                },
                isEnoughPlayers = () => room.playerSlots.filter((user) => user !== null).length > 3,
                endGame = () => {
                    room.phase = 0;
                    room.time = 0;
                    room.currentPerson = null;
                    room.speechPlayers.clear();
                    room.paused = true;
                    if (!isEnoughPlayers())
                        room.teamsLocked = false;
                    room.prevMaster = room.playerSlots[room.master] || null;
                    update();
                    updateState();
                },
                removePlayer = (playerId) => {
                    room.wantMasterList.delete(playerId);
                    if (~room.playerSlots.indexOf(playerId))
                        room.playerSlots[room.playerSlots.indexOf(playerId)] = null;
                    if (room.spectators.has(playerId) || !room.onlinePlayers.has(playerId)) {
                        delete room.playerNames[playerId];
                        room.spectators.delete(playerId);
                        this.emit("user-kicked", playerId);
                    } else {
                        room.spectators.add(playerId);
                        sendState(playerId);
                    }
                },
                userJoin = (data) => {
                    const user = data.userId;
                    if (!room.playerNames[user])
                        room.spectators.add(user);
                    room.onlinePlayers.add(user);
                    room.playerNames[user] = data.userName.substr && data.userName.substr(0, 60);
                    if (data.avatarId) {
                        fs.stat(`${registry.config.appDir || __dirname}/public/avatars/${user}/${data.avatarId}.png`, (err) => {
                            if (!err) {
                                room.playerAvatars[user] = data.avatarId;
                                update()
                            }
                        });
                    }
                    update();
                    sendState(user);
                },
                userLeft = (user) => {
                    room.onlinePlayers.delete(user);
                    if (room.spectators.has(user))
                        delete room.playerNames[user];
                    room.spectators.delete(user);
                    update();
                },
                userEvent = (user, event, data) => {
                    this.lastInteraction = new Date();
                    try {
                        if (this.userEventHandlers[event])
                            this.userEventHandlers[event](user, data[0], data[1], data[2], data[3]);
                        else if (this.slotEventHandlers[event] && ~room.playerSlots.indexOf(user))
                            this.slotEventHandlers[event](room.playerSlots.indexOf(user), data[0], data[1], data[2], data[3]);
                    } catch (error) {
                        console.error(error);
                        registry.log(error.message);
                    }
                };
            this.userJoin = userJoin;
            this.userLeft = userLeft;
            this.userEvent = userEvent;
            this.slotEventHandlers = {
                "select-card": (slot, cardSlot, type, id) => {
                    if (room.cards[cardSlot] && ~["weapons", "clues"].indexOf(type) && ~[0, 1, 2, 3].indexOf(id)) {
                        if ((room.phase !== 1 && room.cards[slot].hasBadge)
                            || (room.phase === 1 && ~[state.murderer, state.assistant].indexOf(slot) && cardSlot === state.murderer)) {
                            const currentCard = getSelectedCard(slot, type, true);
                            if (!(currentCard && currentCard.slot === cardSlot && currentCard.id === id))
                                (room.phase === 1 ? state.crimePlan : room.cards)[cardSlot][`${type}Selected`][id].push(slot);
                            if (room.phase === 1)
                                updateState();
                            else
                                update();
                        }
                    }
                },
                "mark-card": (slot, cardSlot, type, id, color) => {
                    if (room.cards[cardSlot] && ~["weapons", "clues"].indexOf(type) && ~[0, 1, 2, 3].indexOf(id)
                        && ((room.phase !== 1 && !color && room.master !== slot)
                            || (color >= 0 && color < room.playerSlots.length && ~[state.murderer, state.assistant].indexOf(slot)))) {
                        color = color === undefined ? slot : color;
                        const cardSlots = (room.phase === 1 ? state.crimePlan : room.cards)[cardSlot][`${type}Marked`][id];
                        if (~cardSlots.indexOf(color))
                            cardSlots.splice(cardSlots.indexOf(color), 1);
                        else
                            cardSlots.push(color);
                        if (room.phase === 1)
                            updateState();
                        else
                            update();
                    }
                },
                "accept-crime": (slot) => {
                    if (room.phase === 1 && state.murderer === slot) {
                        const
                            selectedWeapon = getSelectedCard(slot, "weapons"),
                            selectedClue = getSelectedCard(slot, "clues");
                        if (selectedWeapon && selectedClue
                            && selectedWeapon.slot === state.murderer && selectedClue.slot === state.murderer) {
                            state.weapon = selectedWeapon.id;
                            state.clue = selectedClue.id;
                            startMaster();
                        }
                    }
                },
                "set-bullet": (slot, tile, id) => {
                    if (room.phase !== 1 && room.master === slot && tile >= 0 && tile <= 6 && id >= 0 && id <= 5 && room.reconBullets[tile] === undefined) {
                        room.reconBullets[tile] = id;
                        if (Object.keys(room.reconBullets).length === 6)
                            startCommon();
                    }
                    update();
                },
                "change-location-tile": (slot) => {
                    if (slot === room.master && room.reconBullets[1] === undefined) {
                        room.reconTiles[1]++;
                        if (room.reconTiles[1] === 8)
                            room.reconTiles[1] = 4;
                    }
                    update();
                },
                "swap-recon-tile": (slot, tile) => {
                    if (room.master === slot && room.reconTiles.length === 7 && room.reconBullets[6] && tile > 1) {
                        room.reconTiles[tile] = room.reconTiles.pop();
                        room.reconBullets[tile] = room.reconBullets[6];
                        delete room.reconBullets[6];
                    }
                    update();
                },
                "toggle-speech": (slot) => {
                    if (room.cards[slot] && slot !== room.master && (room.phase === 3 || (room.phase === 4 && room.currentPerson <= slot))) {
                        if (!room.speechPlayers.delete(slot))
                            room.speechPlayers.add(slot);
                        if (room.phase === 3 && room.speechPlayers.size === 0)
                            startPerson();
                        else if (room.phase === 4 && room.currentPerson === slot && !room.speechPlayers.has(slot))
                            nextPerson();
                    }
                    update();
                },
                "charge": (slot) => {
                    if ((room.phase > 1) && room.cards[slot] && room.cards[slot].hasBadge) {
                        const
                            selectedWeapon = getSelectedCard(slot, "weapons"),
                            selectedClue = getSelectedCard(slot, "clues");
                        if (selectedWeapon && selectedClue && selectedWeapon.slot === selectedClue.slot) {
                            room.cards[slot].hasBadge = false;
                            if (selectedWeapon.slot === state.murderer
                                && selectedWeapon.id === state.weapon && selectedClue.id === state.clue) {
                                room.playerSuccess = slot;
                                startWitness();
                            } else if (room.cards.filter((cards, slotId) => cards && cards.hasBadge
                                && slotId !== state.murderer
                                && slotId !== state.assistant).length === 0) endGame();
                        }
                    }
                    update();
                },
                "pick-witness": (slot, witness) => {
                    if (room.phase === 5 && state.murderer === slot) {
                        room.playerShot = witness;
                        if (state.witness === witness)
                            room.crimeWin = true;
                        endGame();
                    }
                    update();
                }
            };
            this.userEventHandlers = {
                "update-avatar": (user, id) => {
                    room.playerAvatars[user] = id;
                    update()
                },
                "toggle-lock": (user) => {
                    if (user === room.hostId)
                        room.teamsLocked = !room.teamsLocked;
                    update();
                },
                "change-name": (user, value) => {
                    if (value)
                        room.playerNames[user] = value.substr && value.substr(0, 60);
                    update();
                },
                "remove-player": (user, playerId) => {
                    if (playerId && user === room.hostId)
                        removePlayer(playerId);
                    update();
                },
                "give-host": (user, playerId) => {
                    if (playerId && user === room.hostId) {
                        room.hostId = playerId;
                        this.emit("host-changed", user, playerId);
                    }
                    update();
                },
                "players-join": (user, slot) => {
                    if (!room.teamsLocked && room.playerSlots[slot] === null) {
                        if (~room.playerSlots.indexOf(user))
                            room.playerSlots[room.playerSlots.indexOf(user)] = null;
                        room.spectators.delete(user);
                        room.playerSlots[slot] = user;
                        update();
                        sendState(user);
                    }
                },
                "spectators-join": (user) => {
                    if (!room.teamsLocked && ~room.playerSlots.indexOf(user)) {
                        room.playerSlots[room.playerSlots.indexOf(user)] = null;
                        room.wantMasterList.delete(user);
                        room.spectators.add(user);
                        update();
                        sendState(user);
                    }
                },
                "toggle-want-master": (user) => {
                    if (~room.playerSlots.indexOf(user) && room.prevMaster !== user && !room.wantMasterList.has(user))
                        room.wantMasterList.add(user);
                    else
                        room.wantMasterList.delete(user);
                    update();
                },
                "toggle-pause": (user) => {
                    if (user === room.hostId) {
                        if (room.phase !== 0)
                            room.paused = !room.paused;
                        else if (isEnoughPlayers())
                            startGame();
                        if (!room.paused)
                            room.teamsLocked = true;
                        update();
                        updateState();
                    }
                },
                "toggle-timed": (user) => {
                    if (user === room.hostId) {
                        room.timed = !room.timed;
                        if (!room.timed)
                            room.paused = true;
                    }
                    update();
                },
                "toggle-speech-mode": (user) => {
                    if (user === room.hostId && room.phase === 0) {
                        room.personalSpeechMode = !room.personalSpeechMode;
                        if (room.personalSpeechMode) {
                            room.commonTime = 120;
                            room.personTime = 60;
                        } else {
                            room.commonTime = 60;
                            room.personTime = 240;
                        }
                    }
                    update();
                },
                "abort-game": (user) => {
                    if (user === room.hostId) {
                        endGame();
                    }
                    update();
                },
                "set-time": (user, type, value) => {
                    if (user === room.hostId && ~["crime", "master", "common", "person", "witness"].indexOf(type) && !isNaN(parseInt(value)))
                        room[`${type}Time`] = parseFloat(value);
                    update();
                }
            };
        }

        getPlayerCount() {
            return Object.keys(this.room.playerNames).length;
        }

        getActivePlayerCount() {
            return this.room.onlinePlayers.size;
        }

        getLastInteraction() {
            return this.lastInteraction;
        }

        getSnapshot() {
            return {
                room: this.room,
                state: this.state,
            };
        }

        setSnapshot(snapshot) {
            Object.assign(this.room, snapshot.room);
            Object.assign(this.state, snapshot.state);
            this.room.onlinePlayers = new JSONSet();
            this.room.spectators = new JSONSet();
            this.room.speechPlayers = new JSONSet(this.room.speechPlayers);
            this.room.wantMasterList = new JSONSet(this.room.wantMasterList);
            this.room.onlinePlayers.clear();
        }
    }

    function makeId() {
        let text = "";
        const possible = "abcdefghijklmnopqrstuvwxyz0123456789";

        for (let i = 0; i < 5; i++)
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        return text;
    }

    function shuffleArray(array) {
        let currentIndex = array.length, temporaryValue, randomIndex;
        while (0 !== currentIndex) {
            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex -= 1;
            temporaryValue = array[currentIndex];
            array[currentIndex] = array[randomIndex];
            array[randomIndex] = temporaryValue;
        }
        return array;
    }

    class JSONSet extends Set {
        constructor(iterable) {
            super(iterable)
        }

        toJSON() {
            return [...this]
        }
    }

    function getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1) + min);
    }

    registry.createRoomManager(path, channel, GameState);
}

module.exports = init;

