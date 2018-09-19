//import React from "react";
//import ReactDOM from "react-dom"
//import io from "socket.io"
function makeId() {
    let text = "";
    const possible = "abcdefghijklmnopqrstuvwxyz0123456789";

    for (let i = 0; i < 5; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    return text;
}

class Player extends React.Component {
    render() {
        const
            data = this.props.data,
            id = this.props.id;
        return (
            <div className={
                "player"
                + (!~data.onlinePlayers.indexOf(id) ? " offline" : "")
                + (id === data.userId ? " self" : "")
            }
                 data-playerId={id}>
                {data.playerNames[id]}
                <div className="player-host-controls">
                    {(data.hostId === data.userId && data.userId !== id) ? (
                        <i className="material-icons host-button"
                           title="Give host"
                           onClick={(evt) => this.props.handleGiveHost(id, evt)}>
                            vpn_key
                        </i>
                    ) : ""}
                    {(data.hostId === data.userId && data.userId !== id) ? (
                        <i className="material-icons host-button"
                           title="Remove"
                           onClick={(evt) => this.props.handleRemovePlayer(id, evt)}>
                            delete_forever
                        </i>
                    ) : ""}
                    {(data.hostId === id) ? (
                        <i className="material-icons host-button inactive"
                           title="Game host">
                            stars
                        </i>
                    ) : ""}
                </div>
            </div>
        );
    }
}


class Spectators extends React.Component {
    render() {
        const
            data = this.props.data,
            handleSpectatorsClick = this.props.handleSpectatorsClick;
        return (
            <div
                onClick={handleSpectatorsClick}
                className="spectators">
                Spectators:
                {
                    data.spectators.length ? data.spectators.map(
                        (player, index) => (<Player key={index} data={data} id={player}
                                                    handleRemovePlayer={this.props.handleRemovePlayer}
                                                    handleGiveHost={this.props.handleGiveHost}/>)
                    ) : " ..."
                }
            </div>
        );
    }
}

class Card extends React.Component {
    render() {
        try {
            const
                props = this.props,
                position = props.card === null
                    ? 0
                    : ((props.card + 1) * 72),
                isRightCard = props.data.player.weapon
                    && props.data.player.murderer === props.slot
                    && props.data.player[props.cardType === "weapons" ? "weapon" : "clue"] === props.card;
            return (<div className={`card`}>
                <div className={`card-face ${props.cardType} ${isRightCard ? "right-card" : ""}`}
                     onClick={(evt) => !evt.stopPropagation() && props.handleCardMark(props.cardId)}
                     style={{"background-position-x": -position}}/>
                <div className="card-selects">
                    {(props.selectsData || []).map((selectSlot) => {
                        const
                            hasBadge = props.data.cards[selectSlot].hasBadge,
                            isPlayer = props.data.userSlot === selectSlot;
                        return (<div
                            className={`card-check card-check-slot-${selectSlot} ${!hasBadge ? "checked" : ""} ${isPlayer ? "button" : ""}`}
                            onClick={() => isPlayer && props.handleCardSelect(props.cardId)}>
                            {hasBadge ? "✔" : "✖"}
                        </div>);
                    })}
                    {!~(props.selectsData || []).indexOf(props.data.userSlot) ? (
                        <div className={`card-check card-check-slot-${props.slot} button`}
                             onClick={() => props.handleCardSelect(props.cardId)}>✔</div>) : ""}
                </div>
                <div className="card-marks">
                    {(props.marksData || []).map((selectSlot) => (
                        <div className={`card-mark card-mark-slot-${selectSlot}`}/>))}
                </div>
            </div>)
        } catch (e) {
            console.error(e);
            debugger;
        }
    }
}

class ReconTile extends React.Component {
    render() {
        try {
            const props = this.props;
            return (<div className="recon-tile">
                <div className="recon-tile-face" style={{"background-position-x": props.tile * -160}}>
                    <div className="recon-tile-options">
                        {Array(6).fill(null).map((v, id) => (
                            <div
                                className={`recon-tile-option ${props.data.reconBullets[props.tileId] !== null
                                    ? (props.data.reconBullets[props.tileId] === id ? "selected" : "")
                                    : "button"}`}
                                onClick={() => props.data.reconBullets[props.tileId] !== null
                                    && props.handleSetBullet(props.tileId, id)}/>))}
                    </div>
                </div>
                {props.data.reconTiles.length > 6 ? (
                    <div className="recon-tile-swap-button" onClick={() => props.handleSwapReconTile(props.tileId)}>
                        Заменить
                    </div>) : ""}
                {props.data.reconBullets[props.tileId] === null ? (
                    <div className="recon-tile-change-location-button" onClick={() => props.handleChangeLocationTile()}>
                        <i className="material-icons">filter_none</i>
                    </div>) : ""}
            </div>);
        } catch (e) {
            console.error(e);
            debugger;
        }
    }
}

class PlayerSlot extends React.Component {
    render() {
        try {
            const
                data = this.props.data,
                slot = this.props.slot,
                game = this.props.game,
                isMaster = this.props.isMaster,
                player = data.playerSlots[slot],
                cards = data.cards[slot] ? data.cards[slot] : {
                    weapons: [null, null, null, null],
                    clues: [null, null, null, null]
                },
                cardData = ((data.player && data.player.crimePlan) ? data.player.crimePlan[slot] : data.cards[slot]) || {
                    weaponsSelected: [],
                    weaponsMarked: [],
                    cluesSelected: [],
                    cluesMarked: []
                },
                roles = ["master", "murderer", "assistant", "witness", "investigator", "unknown", "crime"];
            let role;
            if (data.master === slot)
                role = ["master", "Криминалист. Всё знает, но не может говорить"];
            else if (data.player.murderer === slot)
                role = ["murderer", "Убийца. В начале игры выбирает оружие и улику, а потом пытается всех запутать"];
            else if (data.player.assistant === slot)
                role = ["assistant", "Сообщник. Помогает убийце запутать следователей"];
            else if (data.player.witness === slot)
                role = ["witness", "Свидетель. Знает преступников, но не может напрямую об этом сказать, иначе его убьют"];
            else if (data.player.suspects && ~data.player.suspects.indexOf(slot))
                role = ["crime", "Убийца или сообщник"];
            else if (data.crimeWin !== null || ~[data.master, data.witness].indexOf(data.userSlot))
                role = ["investigator", "Обычный следователь"];
            else
                role = ["unknown", "Роль неизвестна"];
            return (
                <div
                    className={`player-slot ${~data.speechPlayers.indexOf(slot) ? "want-speech" : ""}
                            ${data.currentPerson === slot ? "current" : ""}
                            ${isMaster ? "master-slot" : ""}
                            player-slot-${slot}`}>
                    <div className="player-section">
                        {player === data.userId
                            ? (<div className="set-avatar-button">
                                <i onClick={() => game.handleClickSetAvatar()}
                                   className="toggle-theme material-icons settings-button">edit</i>
                            </div>)
                            : ""}
                        <div className={`avatar ${player !== null ? "" : "no-player"}`}
                             style={{
                                 "background-image": player !== null ? `url(/deception/${data.playerAvatars[player]
                                     ? `avatars/${player}/${data.playerAvatars[player]}.png`
                                     : "default-user.png"})` : ""
                             }}>
                            <div className="player-role"
                                 style={{"background-position-x": roles.indexOf(role[0]) * -40}}
                                 title={role[1]}/>
                        </div>
                        <div className="player-name">
                            {player !== null
                                ? (<Player id={player} data={data}
                                           handleRemovePlayer={(id, evt) => game.handleRemovePlayer(id, evt)}
                                           handleGiveHost={(id, evt) => game.handleGiveHost(id, evt)}/>)
                                : (<div className="join-slot-button"
                                        onClick={() => game.handlePlayerJoin(slot)}>Войти</div>)}

                        </div>
                        {data.phase === 5 && slot !== data.master
                            ? (<div className="witness-button"
                                    onClick={() => game.handleWitnessClick(slot)}>Убить</div>)
                            : ""}
                    </div>
                    {slot !== data.master ? (<div className="player-cards">
                        <div className="player-cards-weapons">
                            {cards.weapons.map((card, id) => <Card cardId={id} card={card} data={data}
                                                                   slot={slot}
                                                                   selectsData={cardData.weaponsSelected[id]}
                                                                   marksData={cardData.weaponsMarked[id]}
                                                                   handleCardSelect={(id) =>
                                                                       game.handleCardSelect(slot, "weapons", id)}
                                                                   handleCardMark={(id) =>
                                                                       game.handleCardMark(slot, "weapons", id)}
                                                                   cardType="weapons"/>)}
                        </div>
                        <div className="player-cards-clues">
                            {cards.clues.map((card, id) => <Card cardId={id} card={card} data={data}
                                                                 slot={slot}
                                                                 selectsData={cardData.cluesSelected[id]}
                                                                 marksData={cardData.cluesMarked[id]}
                                                                 handleCardSelect={(id) =>
                                                                     game.handleCardSelect(slot, "clues", id)}
                                                                 handleCardMark={(id) =>
                                                                     game.handleCardMark(slot, "clues", id)}
                                                                 cardType="clues"/>)}
                        </div>
                    </div>) : ""}
                </div>);
        } catch (e) {
            console.error(e);
            debugger;
        }
    }
}

class Game extends React.Component {
    componentDidMount() {
        const initArgs = {};
        if (!localStorage.deceptionUserId || !localStorage.deceptionUserToken) {
            while (!localStorage.userName)
                localStorage.userName = prompt("Your name");
            localStorage.deceptionUserId = makeId();
            localStorage.deceptionUserToken = makeId();
        }
        if (!location.hash)
            history.replaceState(undefined, undefined, "#" + makeId());
        initArgs.roomId = location.hash.substr(1);
        initArgs.userId = this.userId = localStorage.deceptionUserId;
        initArgs.token = this.userToken = localStorage.deceptionUserToken;
        initArgs.userName = localStorage.userName;
        this.socket = window.socket.of("deception");
        this.socket.on("state", (state) => {
            this.setState(Object.assign(state, {
                userId: this.userId,
                userSlot: state.playerSlots.indexOf(this.userId),
                player: this.state.player || {},
                color: this.color
            }));
        });
        this.socket.on("player-state", (player) => {
            if (this.state.player.murderer === null)
                if (player.murderer === this.state.userSlot)
                    this.color = 0;
                else if (player.assistant === this.state.userSlot)
                    this.color = 5;
            this.setState(Object.assign(this.state, {
                userId: this.userId,
                userSlot: this.state.userSlot,
                player: player,
                color: this.color
            }));
        });
        window.socket.on("disconnect", (event) => {
            this.setState({
                inited: false,
                disconnected: true,
                disconnectReason: event.reason
            });
        });
        document.title = `Deception - ${initArgs.roomId}`;
        this.socket.emit("init", initArgs);
        this.socket.on("prompt-delete-prev-room", (roomList) => {
            if (localStorage.acceptDelete =
                prompt(`Limit for hosting rooms per IP was reached: ${roomList.join(", ")}. Delete one of rooms?`, roomList[0]))
                location.reload();
        });
        this.socket.on("ping", (id) => {
            this.socket.emit("pong", id);
        });
        this.timerSound = new Audio("/deception/tick.mp3");
        this.timerSound.volume = 0.5;
    }

    constructor() {
        super();
        this.state = {
            inited: false
        };
    }

    debouncedEmit(event, data) {
        clearTimeout(this.debouncedEmitTimer);
        this.debouncedEmitTimer = setTimeout(() => {
            this.socket.emit(event, data);
        }, 100);
    }

    handleChangeTime(value, type) {
        this.debouncedEmit("set-time", type, value);
    }

    handleRemovePlayer(id, evt) {
        evt.stopPropagation();
        this.socket.emit("remove-player", id);
    }

    handleGiveHost(id, evt) {
        evt.stopPropagation();
        this.socket.emit("give-host", id);
    }

    handleToggleTeamLockClick() {
        this.socket.emit("toggle-lock");
    }

    handleClickTogglePause() {
        this.socket.emit("toggle-pause");
    }

    handleToggleTimed() {
        this.socket.emit("toggle-timed");
    }

    handleClickRestart() {
        if (data.phase !== 0 || confirm("Restart? Are you sure?"))
            this.socket.emit("restart-game");
    }

    handleToggleMuteSounds() {
        localStorage.muteSounds = !parseInt(localStorage.muteSounds) ? 1 : 0;
        this.setState(Object.assign({
            userId: this.userId,
            userSlot: this.state.userSlot,
            player: this.state.player,
            color: this.color
        }, this.state));
    }

    handleSpectatorsClick() {
        this.socket.emit("spectators-join");
    }

    handleClickChangeName() {
        const name = prompt("New name");
        this.socket.emit("change-name", name);
        localStorage.userName = name;
    }

    handleClickSetAvatar() {
        document.getElementById("avatar-input").click();
    }

    handleSetAvatar(event) {
        const input = event.target;
        if (input.files && input.files[0]) {
            const
                file = input.files[0],
                uri = "/deception/upload-avatar",
                xhr = new XMLHttpRequest(),
                fd = new FormData(),
                fileSize = ((file.size / 1024) / 1024).toFixed(4); // MB
            if (fileSize <= 5) {
                xhr.open("POST", uri, true);
                xhr.onreadystatechange = () => {
                    if (xhr.readyState === 4 && xhr.status === 200) {
                        localStorage.avatarId = xhr.responseText;
                        this.socket.emit("update-avatar", localStorage.avatarId);
                    } else if (xhr.readyState === 4 && xhr.status !== 200) alert("File upload error");
                };
                fd.append("avatar", file);
                fd.append("userId", this.userId);
                fd.append("userToken", this.userToken);
                xhr.send(fd);
            }
            else
                alert("File shouldn't be larger than 5 MB");
        }
    }

    handleCardSelect(slot, type, id) {
        this.socket.emit("select-card", slot, type, id);
    }

    handleCardMark(slot, type, id) {
        this.socket.emit("mark-card", slot, type, id, this.color);
    }

    handlePlayerJoin(slot) {
        this.socket.emit("players-join", slot);
    }

    handleWitnessClick(slot) {
        this.socket.emit("pick-witness", slot);
    }

    handleAcceptCrimeClick() {
        this.socket.emit("accept-crime");
    }

    handleChargeClick() {
        this.socket.emit("charge");
    }

    handleToggleSpeech() {
        this.socket.emit("toggle-speech");
    }

    handleSetBullet(tile, id) {
        this.socket.emit("set-bullet", tile, id);
    }

    handleSwapReconTile(tile) {
        this.socket.emit("swap-recon-tile", tile);
    }

    handleChangeLocationTile() {
        this.socket.emit("change-location-tile");
    }

    render() {
        try {
            clearTimeout(this.timerTimeout);
            if (this.state.disconnected)
                return (<div
                    className="kicked">Disconnected{this.state.disconnectReason ? ` (${this.state.disconnectReason})` : ""}</div>);
            else if (this.state.inited) {
                const
                    data = this.state,
                    isHost = data.hostId === data.userId,
                    inProcess = data.phase !== 0 || data.paused,
                    parentDir = location.pathname.match(/(.+?)\//)[1],
                    wantSpeech = !!~data.speechPlayers.indexOf(data.userSlot);
                let status, showChargeButton, showCrimeButton;
                if (data.inited) {
                    const
                        prevResult = data.crimeWin === null ? "" : (data.crimeWin ? "Преступники победили! " : "Победа правосудия! "),
                        lastRoundWarn = (data.round === 3 && data.cards[data.userSlot].hasBadge) ? ". Успейте предъявить обвинение до конца раунда" : "";
                    if (data.playerSlots.filter((slot) => slot !== null).length < 4)
                        status = `${prevResult}Недостаточно игроков`;
                    else if (data.phase === 0)
                        if (data.userId === data.hostId)
                            status = `${prevResult}Вы можете начать игру`;
                        else
                            status = `${prevResult}Хост может начать игру`;
                    else if (data.phase === 1)
                        if (data.player.murderer === data.userSlot)
                            status = "Выберите орудие и улику";
                        else if (data.player.assistant === data.userSlot)
                            status = "Помогите убийце выбрать орудие и улику";
                        else
                            status = "Преступление совершается, подождите";
                    else if (data.phase === 2)
                        if (data.master === data.userSlot)
                            status = "Опишите преступление, выбирая пункты на панелях реконструкции";
                        else
                            status = "Обсуждайте имеющиеся сведения, пока криминалист делает свою работу";
                    else if (data.phase === 3)
                        if (data.master === data.userSlot && data.reconTiles.length > 6)
                            if (data.reconBullets[6] === undefined)
                                status = "Выберите пункт на новой панели реконструкции";
                            else
                                status = "Замените одну из панелей реконструкции";
                        else if (data.round !== 3)
                            status = "Фаза обсуждения";
                        else
                            status = "Последняя фаза обсуждения. Время предъявлять обвинения";
                    else if (data.phase === 4)
                        if (data.master === data.userSlot)
                            status = "Фаза высказываний";
                        else if (data.currentPerson === data.userSlot)
                            status = `Высказывайте подозрения${lastRoundWarn}`;
                        else
                            status = `Соблюдайте тишину, дожидаясь своей очереди${lastRoundWarn}`;
                    else if (data.phase === 5)
                        if (data.player.murderer === data.userSlot)
                            status = "Вас раскрыли! Попытайтесь найти свидетеля";
                        else if (data.player.assistant === data.userSlot)
                            status = "Вас раскрыли! Помогите убийце найти свидетеля";
                        else
                            status = "Убийца ищет свидетеля";
                }
                if (inProcess && this.timed) {
                    let timeStart = new Date();
                    this.timerTimeout = setTimeout(() => {
                        if (!this.state.paused) {
                            let prevTime = this.state.time,
                                time = prevTime - (new Date - timeStart);
                            this.setState(Object.assign({}, this.state, {
                                userId: this.userId,
                                userSlot: this.userSlot,
                                player: this.state.player,
                                color: this.color,
                                time: time
                            }));
                            if (this.state.timed && !this.state.paused && time < 6000
                                && ((Math.floor(prevTime / 1000) - Math.floor(time / 1000)) > 0) && !parseInt(localStorage.muteSounds))
                                this.timerSound.play();
                        }
                    }, 100);
                }
                if (data.phase === 1 && data.userSlot === data.player.murderer)
                    Object.keys(data.cards).forEach((slot) => {
                        const cardsSlot = data.cards[slot];
                        if (cardsSlot && slot === data.userSlot) {
                            let weaponSelected, clueSelected;
                            cardsSlot.weaponsSelected.forEach((weaponSlots) => {
                                if (weaponSlots.indexOf(data.userSlot))
                                    weaponSelected = true;
                            });
                            cardsSlot.cluesSelected.forEach((clueSlots) => {
                                if (clueSlots.indexOf(data.userSlot))
                                    clueSelected = true;
                            });
                            showCrimeButton = weaponSelected && clueSelected;
                        }
                    });
                if (data.cards[data.userSlot] && data.cards[data.userSlot].hasBadge) {
                    let weaponSelectedSlot, clueSelectedSlot;
                    Object.keys(data.cards).forEach((slot) => {
                        const cardsSlot = data.cards[slot];
                        if (cardsSlot) {
                            cardsSlot.weaponsSelected.forEach((weaponSlots) => {
                                if (weaponSlots.indexOf(data.userSlot))
                                    weaponSelectedSlot = slot;
                            });
                            cardsSlot.cluesSelected.forEach((clueSlots) => {
                                if (clueSlots.indexOf(data.userSlot))
                                    clueSelectedSlot = slot;
                            });
                        }
                    });
                    showChargeButton = weaponSelectedSlot && (weaponSelectedSlot === clueSelectedSlot);
                }
                const activeSlots = [];
                data.playerSlots.forEach((userId, slot) => {
                    if (data.phase === 0 || (data.cards[slot] !== null && slot !== data.master))
                        activeSlots.push(slot);
                });
                const
                    playerCount = activeSlots.length,
                    showEmptySlots = data.phase === 0 && !data.teamsLocked,
                    slots = (showEmptySlots ? data.playerSlots : activeSlots)
                        .map((value, slot) => showEmptySlots ? slot : value);
                return (
                    <div className="game">
                        <div id="background"/>
                        <div className={`game-board ${(this.state.inited ? "active" : "")}`}>
                            <div className="slot-list">
                                <div className="top-slots">
                                    {slots.slice(0, Math.ceil(playerCount / 2)).reverse().map((slot) => (
                                        <PlayerSlot data={data} slot={slot} game={this}/>))}
                                </div>
                                <div className="middle-slots">
                                    {(<div className="recon-tiles">{data.reconTiles.map((tile, tileId) =>
                                        (<ReconTile data={data} tileId={tileId} tile={tile}
                                                    handleSwapTile={(tile) => this.handleSwapReconTile(tile)}
                                                    handleChangeLocationTile={() => this.handleChangeLocationTile()}
                                                    handleSetBullet={(id) => this.handleSetBullet(tileId, id)}/>))}
                                    </div>)}
                                </div>
                                <div className="bottom-slots">
                                    {slots.slice(Math.ceil(playerCount / 2)).map((slot) => (
                                        <PlayerSlot data={data} slot={slot} game={this}/>))}
                                </div>
                            </div>
                            {data.phase !== 0 ? (<div className="master-section">
                                <PlayerSlot data={data} slot={data.master} game={this} isMaster={true}/>
                            </div>) : ""}
                            <div className={
                                "spectators-section"
                                + ((data.spectators.length > 0 || !data.teamsLocked) ? " active" : "")
                            }>
                                <Spectators data={this.state}
                                            handleSpectatorsClick={() => this.handleSpectatorsClick()}
                                            handleRemovePlayer={(id, evt) => this.handleRemovePlayer(id, evt)}
                                            handleGiveHost={(id, evt) => this.handleGiveHost(id, evt)}/>
                            </div>
                            {data.phase !== 0 && data.timed && data.time ? (<div className="timer">
                                {new Date(data.time).toUTCString().match(/(\d\d:\d\d )/)[0].trim()}
                            </div>) : ""}
                            <div className="status-panel">{status}</div>
                            <div className="progress-panel">
                                <div className={`progress ${data.phase === 1 ? "active" : ""}`}>Убийство</div>
                                <div className={`progress ${data.phase === 2 ? "active" : ""}`}>Реконструкция</div>
                                <div className="progress-round">
                                    <div
                                        className={`progress ${data.phase > 2 && data.round === 1 ? "active" : ""}`}>1
                                    </div>
                                    <div
                                        className={`progress ${data.phase > 2 && data.round === 2 ? "active" : ""}`}>2
                                    </div>
                                    <div
                                        className={`progress ${data.phase > 2 && data.round === 3 ? "active" : ""}`}>3
                                    </div>
                                </div>
                                <div className={`progress ${data.phase === 3 ? "active" : ""}`}>Обсуждение</div>
                                <div className={`progress ${data.phase === 4 ? "active" : ""}`}>Высказывания</div>
                            </div>
                            <div className={`speech-panel${~[3, 4].indexOf(data.phase) ? "active" : ""}`}>
                                <div className={`switch ${wantSpeech ? "on" : ""}`}
                                     onClick={() => this.handleToggleSpeech()}/>
                                <div className="speech-panel-indicators">
                                    <div className={`speech-mode ${wantSpeech ? "active" : ""}`}>Мне есть, что
                                        сказать
                                    </div>
                                    <div className={`speech-mode ${!wantSpeech ? "active" : ""}`}>Больше нечего
                                        сказать
                                    </div>
                                </div>
                            </div>
                            {showChargeButton
                                ? (<div className="charge-button" onClick={() => this.handleChargeClick()}>
                                    Предъявить обвинение</div>)
                                : ""}
                            {showCrimeButton
                                ? (<div className="crime-button" onClick={() => this.handleAcceptCrimeClick()}>
                                    Совершить преступление</div>)
                                : ""}
                            <div className="host-controls">
                                {data.timed ? (<div className="host-controls-menu">
                                    <div className="little-controls">
                                        <div className="game-settings">
                                            <div className="set-master-time"><i title="crime time"
                                                                                className="material-icons">alarm_add</i>
                                                {(isHost && !inProcess) ? (<input id="goal"
                                                                                  type="number"
                                                                                  defaultValue={this.state.crimeTime}
                                                                                  min="0"
                                                                                  onChange={evt => !isNaN(evt.target.valueAsNumber)
                                                                                      && this.handleChangeTime(evt.target.valueAsNumber, "crime")}
                                                />) : (<span className="value">{this.state.crimeTime}</span>)}
                                            </div>
                                            <div className="set-team-time"><i title="master time"
                                                                              className="material-icons">alarm</i>
                                                {(isHost && !inProcess) ? (<input id="round-time"
                                                                                  type="number"
                                                                                  defaultValue={this.state.masterTime}
                                                                                  min="0"
                                                                                  onChange={evt => !isNaN(evt.target.valueAsNumber)
                                                                                      && this.handleChangeTime(evt.target.valueAsNumber, "master")}
                                                />) : (<span className="value">{this.state.masterTime}</span>)}
                                            </div>
                                            <div className="set-add-time"><i title="common time"
                                                                             className="material-icons">alarm_on</i>
                                                {(isHost && !inProcess) ? (<input id="round-time"
                                                                                  type="number"
                                                                                  defaultValue={this.state.commonTime}
                                                                                  min="0"
                                                                                  onChange={evt => !isNaN(evt.target.valueAsNumber)
                                                                                      && this.handleChangeTime(evt.target.valueAsNumber, "common")}
                                                />) : (<span className="value">{this.state.commonTime}</span>)}
                                            </div>
                                            <div className="set-add-time"><i title="personal time"
                                                                             className="material-icons">timer</i>
                                                {(isHost && !inProcess) ? (<input id="round-time"
                                                                                  type="number"
                                                                                  defaultValue={this.state.personTime}
                                                                                  min="0"
                                                                                  onChange={evt => !isNaN(evt.target.valueAsNumber)
                                                                                      && this.handleChangeTime(evt.target.valueAsNumber, "person")}
                                                />) : (<span className="value">{this.state.personTime}</span>)}
                                            </div>
                                        </div>
                                    </div>
                                </div>) : ""}
                                <div className="side-buttons">
                                    <i onClick={() => window.location = parentDir}
                                       className="material-icons exit settings-button">exit_to_app</i>
                                    {(isHost && (data.timed || data.phase === 0)) ? (!inProcess
                                        ? (<i onClick={() => this.handleClickTogglePause()}
                                              className="material-icons start-game settings-button">play_arrow</i>)
                                        : (<i onClick={() => this.handleClickTogglePause()}
                                              className="material-icons start-game settings-button">pause</i>)) : ""}
                                    {(isHost && data.paused) ? (data.teamsLocked
                                        ? (<i onClick={() => this.handleToggleTeamLockClick()}
                                              className="material-icons start-game settings-button">lock_outline</i>)
                                        : (<i onClick={() => this.handleToggleTeamLockClick()}
                                              className="material-icons start-game settings-button">lock_open</i>)) : ""}
                                    {(isHost && data.paused) ? (!data.timed
                                        ? (<i onClick={() => this.handleToggleTimed()}
                                              className="material-icons start-game settings-button">alarm_off</i>)
                                        : (<i onClick={() => this.handleToggleTimed()}
                                              className="material-icons start-game settings-button">alarm</i>)) : ""}
                                    {(isHost && data.paused && data.phase !== 0)
                                        ? (<i onClick={() => this.handleClickRestart()}
                                              className="toggle-theme material-icons settings-button">sync</i>) : ""}
                                    <i onClick={() => this.handleClickChangeName()}
                                       className="toggle-theme material-icons settings-button">edit</i>
                                    {!parseInt(localStorage.muteSounds)
                                        ? (<i onClick={() => this.handleToggleMuteSounds()}
                                              className="toggle-theme material-icons settings-button">volume_up</i>)
                                        : (<i onClick={() => this.handleToggleMuteSounds()}
                                              className="toggle-theme material-icons settings-button">volume_off</i>)}
                                </div>
                                <i className="settings-hover-button material-icons">settings</i>
                                <input id="avatar-input" type="file" onChange={evt => this.handleSetAvatar(evt)}/>
                            </div>
                        </div>
                    </div>
                );
            }
            else return (<div/>);
        } catch (error) {
            console.error(error);
            debugger;
            return (<div
                className="kicked">{`Client error: ${error.message}`}</div>);
        }
    }
}

ReactDOM.render(<Game/>, document.getElementById('root'));
