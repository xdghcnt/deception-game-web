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
            id = this.props.id,
            hasPlayer = id !== null;
        return (
            <div className={cs("player", {offline: !~data.onlinePlayers.indexOf(id), self: id === data.userId})}
                 data-playerId={id}
                 onTouchStart={(e) => e.target.focus()}>
                <div className={cs("player-name-text", `bg-color-${this.props.slot}`)}>
                    <UserAudioMarker data={data} user={id}/>
                    {hasPlayer
                        ? data.playerNames[id]
                        : (data.teamsLocked
                            ? (<div className="slot-empty">Пусто</div>)
                            : (<div className="join-slot-button"
                                    onClick={() => this.props.handlePlayerJoin(this.props.slot)}>Занять место</div>))}
                </div>
                {hasPlayer ? (<div className="player-host-controls">
                    {(data.hostId === data.userId && data.userId !== id) ? (
                        <i className="material-icons host-button"
                           title="Передать хост"
                           onClick={(evt) => this.props.handleGiveHost(id, evt)}>
                            vpn_key
                        </i>
                    ) : ""}
                    {(data.hostId === data.userId && data.userId !== id) ? (
                        <i className="material-icons host-button"
                           title="Удалить"
                           onClick={(evt) => this.props.handleRemovePlayer(id, evt)}>
                            delete_forever
                        </i>
                    ) : ""}
                    {(data.hostId === id) ? (
                        <i className="material-icons host-button inactive"
                           title="Хост">
                            stars
                        </i>
                    ) : ""}
                </div>) : ""}
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
                Зрители:
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
                    : ((props.card + 1) * 72.26),
                isRightCard = props.data.player.weapon !== null
                    && props.data.player.murderer === props.slot
                    && props.data.player[props.cardType === "weapons" ? "weapon" : "clue"] === props.cardId,
                isCriminal = props.data.userSlot !== null && (props.data.userSlot === props.data.player.murderer || props.data.userSlot === props.data.player.assistant);
            return (<div
                className={cs("card", {
                    correct: isRightCard,
                    button: props.data.userSlot !== null && (props.data.phase > 1 || isCriminal)
                })}
                onTouchStart={(e) => e.target.focus()}
                onClick={(evt) => !evt.stopPropagation() && props.handleCardMark(props.cardId)}>
                <div
                    className={cs("card-face", props.cardType, {back: props.card === null})}
                    style={{"background-position-x": -position}}/>
                <div className="card-marks">
                    {(props.marksData || []).map((selectSlot) => (
                        <div className={cs("card-mark", `card-mark-slot-${selectSlot}`, `bg-color-${selectSlot}`)}/>))}
                </div>
                <div className="card-selects">
                    {(props.selectsData || []).map((selectSlot) => {
                        const
                            hasBadge = props.data.cards[selectSlot] && props.data.cards[selectSlot].hasBadge,
                            isPlayer = props.data.userSlot === selectSlot;
                        return (<div
                            className={cs("card-check", `card-check-slot-${selectSlot}`, `bg-color-${selectSlot}`, {
                                checked: !hasBadge,
                                button: isPlayer
                            })}
                            onClick={(evt) => !evt.stopPropagation() && isPlayer && props.handleCardSelect(props.cardId)}>
                            {hasBadge || props.data.playerSuccess === selectSlot ? "✔" : "✖"}
                        </div>);
                    })}
                    {props.data.userSlot !== null && props.data.master !== props.data.userSlot
                    && ((props.data.phase > 1 && props.data.cards[props.data.userSlot].hasBadge)
                        || (props.data.phase === 1 && props.data.player.murderer === props.slot && isCriminal))
                    && !~(props.selectsData || []).indexOf(props.data.userSlot)
                        ? (
                            <div
                                className={cs("card-check", `card-check-slot-${props.data.userSlot}`, `bg-color-${props.data.userSlot}`, "button", "not-set")}
                                onClick={(evt) => !evt.stopPropagation() && props.handleCardSelect(props.cardId)}>✔</div>)
                        : ""}
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
            const
                props = this.props,
                unselected = props.data.phase > 1 && props.data.reconBullets[props.tileId] === undefined,
                isMaster = props.data.userSlot === props.data.master;
            return (<div className={cs("recon-tile", {unselected})}>
                <div className="recon-tile-face" style={{"background-position-x": props.tile * -160}}>
                    <div className="recon-tile-options">
                        {Array(6).fill(null).map((v, id) => (
                            <div
                                className={cs("recon-tile-option", {
                                    selected: props.data.reconBullets[props.tileId] === id,
                                    button: props.data.reconBullets[props.tileId] === null
                                })}
                                onClick={() => props.data.reconBullets[props.tileId] !== null
                                    && props.game.handleSetBullet(props.tileId, id)}/>))}
                    </div>
                </div>
                {isMaster && props.data.reconTiles.length > 6 && props.tileId !== 6 && props.tileId > 1 && props.data.reconBullets[6] != null ? (
                    <div className="recon-tile-swap-button"
                         onClick={() => props.game.handleSwapReconTile(props.tileId)}>
                        <i className="material-icons">repeat</i>
                    </div>) : ""}
                {(isMaster || props.data.phase === 1) && props.tileId === 1
                && props.data.reconBullets[props.tileId] === undefined
                && !props.data.simpleLocations ? (
                    <div className="recon-tile-change-location-button"
                         onClick={(evt) => !evt.stopPropagation() && props.game.handleChangeLocationTile()}>
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
                wantSpeech = ~data.speechPlayers.indexOf(slot),
                currentPerson = data.currentPerson === slot,
                cards = data.cards[slot] ? data.cards[slot] : {
                    weapons: Array(data.nextGameCardsSize).fill(null),
                    clues: Array(data.nextGameCardsSize).fill(null)
                },
                cardData = ((data.player && data.player.crimePlan) ? data.player.crimePlan[slot] : data.cards[slot]) || {
                    weaponsSelected: [],
                    weaponsMarked: [],
                    cluesSelected: [],
                    cluesMarked: []
                },
                roles = ["master", "murderer", "assistant", "witness", "investigator", "unknown", "crime"];
            let role, showActionButton;
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
            else if (data.phase === 0 && data.crimeWin !== null
                || (data.master !== null && data.master === data.userSlot) || data.userSlot === slot)
                role = ["investigator", "Обычный следователь"];
            else
                role = ["unknown", "Роль неизвестна"];

            if (data.phase === 1 && slot === data.userSlot && data.player.crimePlan && slot === data.player.murderer) {
                const cardsSlot = data.player.crimePlan[slot];
                if (cardsSlot) {
                    let weaponSelected, clueSelected;
                    cardsSlot.weaponsSelected.forEach((weaponSlots) => {
                        if (~weaponSlots.indexOf(data.userSlot))
                            weaponSelected = true;
                    });
                    cardsSlot.cluesSelected.forEach((clueSlots) => {
                        if (~clueSlots.indexOf(data.userSlot))
                            clueSelected = true;
                    });
                    showActionButton = weaponSelected && clueSelected;
                }
            } else if (data.phase > 1 && data.cards[data.userSlot] && data.cards[data.userSlot].hasBadge) {
                let weaponSelectedSlot, clueSelectedSlot;
                const cardsSlot = data.cards[slot];
                if (cardsSlot) {
                    cardsSlot.weaponsSelected.forEach((weaponSlots) => {
                        if (~weaponSlots.indexOf(data.userSlot))
                            weaponSelectedSlot = slot;
                    });
                    cardsSlot.cluesSelected.forEach((clueSlots) => {
                        if (~clueSlots.indexOf(data.userSlot))
                            clueSelectedSlot = slot;
                    });
                }
                showActionButton = weaponSelectedSlot !== undefined && (weaponSelectedSlot === clueSelectedSlot);
            }
            return (
                <div
                    className={cs("player-slot", `player-slot-${slot}`, {
                        current: data.currentPerson === slot,
                        "want-speech": ~data.speechPlayers.indexOf(slot),
                        "master-slot": isMaster,
                        "no-player": player === null
                    })}>
                    <div className="player-section">
                        <div className={cs("avatar", {"no-player": player === null})}
                             onTouchStart={(e) => e.target.focus()}
                             style={{
                                 "background-image": player !== null ? `url(/deception/${data.playerAvatars[player]
                                     ? `avatars/${player}/${data.playerAvatars[player]}.png`
                                     : "default-user.png"})` : ""
                             }}>
                            <div className="player-role"
                                 style={{"background-position-x": roles.indexOf(role[0]) * -40}}
                                 title={role[1]}/>
                            {cards.hasBadge
                                ? (<div className="player-badge"/>)
                                : ""}
                            {player === data.userId
                                ? (<div className="set-avatar-button">
                                    <i onClick={() => game.handleClickSetAvatar()}
                                       className="toggle-theme material-icons settings-button">edit</i>
                                </div>)
                                : ""}
                            {data.playerShot === slot
                            || (data.phase === 5 && !isMaster && slot !== data.player.murderer && slot !== data.player.assistant)
                                ? (<div className="witness-button"
                                        onClick={() => game.handleWitnessClick(slot)}><i
                                    className="material-icons">{data.playerShot === slot ? "close" : "my_location"}</i>
                                </div>)
                                : ""}
                            {data.master !== slot && ~[3, 4].indexOf(data.phase)
                                ? (<div className={cs("player-want-speech", `bg-color-${slot}`, {
                                    active: data.phase === 3 ? wantSpeech : wantSpeech && currentPerson,
                                    current: currentPerson
                                })}>
                                    <i className="material-icons">{wantSpeech
                                        ? "volume_up"
                                        : "volume_off"}</i>
                                </div>)
                                : ""}
                            {showActionButton
                                ? (<div className="player-action-button-wrap">
                                    <div onClick={() => game.handleActionButton()}
                                         className={cs("player-action-button", `bg-color-${slot}`)}>
                                        {data.phase === 1 ? "Подтвердить" : "Обвинить"}</div>
                                </div>)
                                : ""}
                            {data.phase === 1 && data.userSlot === slot &&
                            (data.userSlot === data.player.murderer || data.userSlot === data.player.assistant)
                                ? <div className={cs("color-picker", `bg-color-${data.color}`)}
                                       onClick={() => game.handleChangeColor()}>
                                    <i className="material-icons">brush</i>
                                </div>
                                : ""}
                        </div>
                        <div className="player-name">
                            <Player id={player} data={data} slot={slot}
                                    handleRemovePlayer={(id, evt) => game.handleRemovePlayer(id, evt)}
                                    handlePlayerJoin={(slot) => game.handlePlayerJoin(slot)}
                                    handleGiveHost={(id, evt) => game.handleGiveHost(id, evt)}/>

                        </div>
                    </div>
                    {slot !== data.master || (data.phase === 0 && !data.teamsLocked) ? (<div className="player-cards">
                        <div
                            className={`player-cards-background player-cards-background-${data.phase === 0
                                ? data.nextGameCardsSize
                                : data.cardsSize}`}/>
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
        this.gameName = "deception";
        const initArgs = {};
        if (!localStorage.deceptionUserId || !localStorage.deceptionUserToken) {
            while (!localStorage.userName)
                localStorage.userName = prompt("Your name");
            localStorage.deceptionUserId = makeId();
            localStorage.deceptionUserToken = makeId();
        }
        if (!location.hash)
            history.replaceState(undefined, undefined, location.origin + location.pathname + "#" + makeId());
        else
            history.replaceState(undefined, undefined, location.origin + location.pathname + location.hash);
        initArgs.roomId = this.roomId = location.hash.substr(1);
        initArgs.userId = this.userId = localStorage.deceptionUserId;
        initArgs.token = this.userToken = localStorage.deceptionUserToken;
        initArgs.userName = localStorage.userName;
        initArgs.wssToken = window.wssToken;
        this.socket = window.socket.of("deception");
        this.socket.on("state", (state) => {
            if (!this.isMuted() && this.state.inited) {
                if (this.state.playerShot == null && state.playerShot != null)
                    this.shotSound.play();
                if (this.state.playerSuccess == null && state.playerSuccess != null)
                    this.correctSound.play();
                else if (this.state.cards && this.state.cards.filter((st) => st && st.hasBadge).length
                    > state.cards.filter((st) => st && st.hasBadge).length)
                    this.wrongSound.play();
                if (Object.keys(this.state.reconBullets).filter((ind) => this.state.reconBullets[ind] != null).length
                    < Object.keys(state.reconBullets).filter((ind) => state.reconBullets[ind] != null).length)
                    this.bulletSetSound.play();
                if (this.state.phase === 0 && state.phase === 1)
                    this.nightSound.play();
                else if (this.state.phase === 1 && state.phase === 2)
                    this.reconSound.play();
                else if (this.state.phase !== 3 && state.phase === 3)
                    this.voiceActiveSound.play();
                else if (this.state.phase !== 4 && state.phase === 4)
                    this.voiceActiveSound.play();
                else if (this.state.currentPerson !== this.state.userSlot && state.currentPerson === this.state.userSlot)
                    this.voiceActiveSound.play();
            }
            CommonRoom.processCommonRoom(state, this.state, {
                maxPlayers: 12,
                largeImageKey: "deception",
                details: "Deception"
            });
            this.setState(Object.assign(state, {
                userId: this.userId,
                userSlot: ~state.playerSlots.indexOf(this.userId)
                    ? state.playerSlots.indexOf(this.userId)
                    : null,
                player: this.state.player || {},
                color: this.state.color
            }));
        });
        this.socket.on("player-state", (player) => {
            if (this.state.player && this.state.player.murderer !== this.state.userSlot && this.state.userSlot !== null
                && player.murderer === this.state.userSlot)
                popup.alert({content: "Вы убийца!"});
            if (this.state.color === undefined)
                if (player.murderer === this.state.userSlot)
                    this.state.color = 0;
                else if (player.assistant === this.state.userSlot)
                    this.state.color = 5;
            this.setState(Object.assign(this.state, {
                userId: this.userId,
                userSlot: this.state.userSlot,
                player: player,
                color: this.state.color
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
        this.socket.on("message", text => {
            popup.alert({content: text});
        });
        this.correctSound = new Audio("/deception/correct.wav");
        this.correctSound.volume = 0.5;
        this.bulletSetSound = new Audio("/deception/bullet-set.wav");
        this.wrongSound = new Audio("/deception/wrong.mp3");
        this.wrongSound.volume = 0.5;
        this.shotSound = new Audio("/deception/shot.wav");
        this.reconSound = new Audio("/deception/recon-phase.wav");
        this.reconSound.volume = 0.5;
        this.voiceActiveSound = new Audio("/deception/voice-active.wav");
        this.nightSound = new Audio("/deception/night.mp3");
        this.timerSound = new Audio("/deception/tick.mp3");
        this.timerSound.volume = 0.5;
        this.seconds = this.minutes = this.prevSeconds = this.prevMinutes = "00";
    }

    constructor() {
        super();
        this.state = {
            inited: false
        };
    }

    debouncedEmit(event, data1, data2) {
        clearTimeout(this.debouncedEmitTimer);
        this.debouncedEmitTimer = setTimeout(() => {
            this.socket.emit(event, data1, data2);
        }, 50);
    }

    handleChangeParam(value, type) {
        this.debouncedEmit("set-param", type, value);
    }

    handleRemovePlayer(id, evt) {
        evt.stopPropagation();
        if (!this.state.testMode)
            popup.confirm({content: `Removing ${this.state.playerNames[id]}?`}, (evt) => evt.proceed && this.socket.emit("remove-player", id));
        else
            this.socket.emit("remove-player", id);
    }

    handleGiveHost(id, evt) {
        evt.stopPropagation();
        popup.confirm({content: `Give host ${this.state.playerNames[id]}?`}, (evt) => evt.proceed && this.socket.emit("give-host", id));
    }

    handleToggleTeamLockClick() {
        this.socket.emit("toggle-lock");
    }

    handleToggleSpeechMode() {
        this.socket.emit("toggle-speech-mode");
    }

    handleClickTogglePause() {
        this.socket.emit("toggle-pause");
    }

    handleToggleSimpleLocations() {
        this.socket.emit("toggle-simple-locations");
    }

    handleToggleDisableWitness() {
        this.socket.emit("toggle-disable-witness");
    }

    handleToggleTimed() {
        this.socket.emit("toggle-timed");
    }

    handleClickStop() {
        popup.confirm({content: "Игра будет отменена. Вы уверены?"}, (evt) => evt.proceed && this.socket.emit("abort-game"));
    }

    handleToggleMuteSounds() {
        localStorage.muteSounds = !parseInt(localStorage.muteSounds) ? 1 : 0;
        this.setState(Object.assign({
            userId: this.userId,
            userSlot: this.state.userSlot,
            player: this.state.player,
            color: this.state.color
        }, this.state));
    }

    handleSpectatorsClick() {
        this.socket.emit("spectators-join");
    }

    handleClickChangeName() {
        popup.prompt({content: "Новое имя", value: this.state.playerNames[this.state.userId] || ""}, (evt) => {
            if (evt.proceed && evt.input_value.trim()) {
                this.socket.emit("change-name", evt.input_value.trim());
                localStorage.userName = evt.input_value.trim();
            }
        });
    }

    handleClickSetAvatar() {
        document.getElementById("avatar-input").click();
    }

    handleSetAvatar(event) {
        const input = event.target;
        if (input.files && input.files[0]) {
            const
                file = input.files[0],
                uri = "/common/upload-avatar",
                xhr = new XMLHttpRequest(),
                fd = new FormData(),
                fileSize = ((file.size / 1024) / 1024).toFixed(4); // MB
            if (fileSize <= 5) {
                xhr.open("POST", uri, true);
                xhr.onreadystatechange = () => {
                    if (xhr.readyState === 4 && xhr.status === 200) {
                        localStorage.avatarId = xhr.responseText;
                        this.socket.emit("update-avatar", localStorage.avatarId);
                    } else if (xhr.readyState === 4 && xhr.status !== 200) popup.alert({content: "Ошибка загрузки"});
                };
                fd.append("avatar", file);
                fd.append("userId", this.userId);
                fd.append("userToken", this.userToken);
                xhr.send(fd);
            } else
                popup.alert({content: "Файл не должен занимать больше 5Мб"});
        }
    }

    toggleWantMaster() {
        if (this.state.prevMaster === this.state.userId)
            popup.alert({content: "Вы уже были Криминалистом в прошлый раз"});
        else
            this.socket.emit("toggle-want-master");
    }

    handleCardSelect(slot, type, id) {
        this.socket.emit("select-card", slot, type, id);
    }

    handleCardMark(slot, type, id) {
        const color = this.state.phase === 1 ? this.state.color : undefined;
        this.socket.emit("mark-card", slot, type, id, color);
    }

    handlePlayerJoin(slot) {
        this.socket.emit("players-join", slot);
    }

    handleWitnessClick(slot) {
        this.socket.emit("pick-witness", slot);
    }

    handleActionButton() {
        this.socket.emit(this.state.phase === 1 ? "accept-crime" : "charge");
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
        if (this.state.userSlot === this.state.master)
            this.socket.emit("change-location-tile");
        else {
            this.state.reconTiles[1]++;
            if (this.state.reconTiles[1] === 8)
                this.state.reconTiles[1] = 4;
            this.setState(this.state);
        }
    }

    handleChangeColor() {
        this.state.color += 1;
        if (this.state.color > 11)
            this.state.color = 0;
        this.setState(Object.assign({}, this.state));
    }

    openRules() {
        window.open("/deception/rules.html", "_blank");
    }

    updateClock() {
        if (this.prevMinutes !== this.minutes)
            this.updateTimerFlipEl(
                document.getElementsByClassName("flip-clock__piece")[0],
                this.minutes,
                this.prevMinutes
            );
        if (this.prevSeconds !== this.seconds)
            this.updateTimerFlipEl(
                document.getElementsByClassName("flip-clock__piece")[1],
                this.seconds,
                this.prevSeconds
            );
    }

    updateTimerFlipEl(el, value, prevValue) {
        if (el) {
            el.getElementsByClassName("card__back")[0].setAttribute("data-value", prevValue);
            el.getElementsByClassName("card__bottom")[0].setAttribute("data-value", prevValue);
            el.getElementsByClassName("card__top")[0].innerText = value;
            el.getElementsByClassName("card__bottom")[1].setAttribute("data-value", value);
            el.classList.remove("flip");
            void el.offsetHeight;
            el.classList.add("flip");
        }
    }

    isMuted() {
        return !!parseInt(localStorage.muteSounds);
    }

    render() {
        try {
            clearInterval(this.timerTimeout);
            if (this.state.disconnected)
                return (<div
                    className="kicked">Disconnected{this.state.disconnectReason ? ` (${this.state.disconnectReason})` : ""}</div>);
            else if (this.state.inited) {
                const
                    data = this.state,
                    isHost = data.hostId === data.userId,
                    inProcess = data.phase !== 0 && !data.paused,
                    parentDir = location.pathname.match(/(.+?)\//)[1],
                    wantSpeech = !!~data.speechPlayers.indexOf(data.userSlot),
                    notEnoughPlayers = data.phase === 0 && data.playerSlots.filter((slot) => slot !== null).length < 4,
                    isSomebodyWin = !(data.phase !== 0 || data.crimeWin === null),
                    isUserWin = isSomebodyWin && ((!~data.spectators.indexOf(data.userId) && (data.userSlot === data.player.murderer
                        || data.userSlot === data.player.assistant)) ? data.crimeWin : !data.crimeWin),
                    isMaster = data.master === data.userSlot;
                let status;
                if (data.time) {
                    const date = new Date(data.time).toUTCString().match(/\d\d:(\d\d):(\d\d)/);
                    this.minutes = date[1];
                    this.seconds = date[2];
                }
                if (data.inited) {
                    const
                        prevResult = data.crimeWin === null ? "" : (data.crimeWin ? "Преступники победили! " : "Победа правосудия! "),
                        lastRoundWarn = (data.round === 3 && data.cards[data.userSlot] && data.cards[data.userSlot].hasBadge) ? ". Успейте предъявить обвинение до конца раунда" : "";
                    if (notEnoughPlayers)
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
                            if (data.master === data.userSlot)
                                status = "Фаза обсуждения";
                            else
                                status = "Фаза обсуждения. Если вы всё обсудили, щёлкните на тумблер с микрофоном";
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
                if (inProcess && this.state.timed && !this.state.paused) {
                    let timeStart = new Date();
                    this.timerTimeout = setInterval(() => {
                        let prevTime = this.state.time,
                            time = prevTime - (new Date() - timeStart);
                        this.state.time = time;
                        const date = new Date(data.time).toUTCString().match(/\d\d:(\d\d):(\d\d)/);
                        this.prevMinutes = this.minutes;
                        this.prevSeconds = this.seconds;
                        this.minutes = date[1];
                        this.seconds = date[2];
                        this.updateClock();
                        if (this.state.timed && !this.state.paused && time < 6000
                            && ((Math.floor(prevTime / 1000) - Math.floor(time / 1000)) > 0) && !this.isMuted())
                            this.timerSound.play();
                        timeStart = new Date();
                    }, 200);
                }
                const activeSlots = [];
                data.playerSlots.forEach((userId, slot) => {
                    if (data.cards[slot] !== null && slot !== data.master)
                        activeSlots.push(slot);
                });
                const
                    playerCount = activeSlots.length,
                    showEmptySlots = data.phase === 0 && !data.teamsLocked,
                    slots = (showEmptySlots ? data.playerSlots : activeSlots)
                        .map((value, slot) => showEmptySlots ? slot : value);
                return (
                    <div className={cs("game", {isMaster})}>
                        <div
                            className={cs("background-list", `phase-${data.phase}`, {
                                [`crime-win-${data.crimeWin ? "true" : "false"}`]: isSomebodyWin,
                                win: isUserWin,
                                fail: isSomebodyWin && !isUserWin
                            })}>
                            <div className="background-witness"/>
                            <div className="background-discussion"/>
                            <div className="background-reconstruction"/>
                            <div className="background-crime"/>
                            <div className="background-initial"/>
                            <div className="background-crime-win"/>
                            <div className="background-crime-lose"/>
                            <div className="background-box"/>
                        </div>
                        <div className={cs("game-board", {active: this.state.inited})}>
                            <div className="slot-list">
                                <div className="top-slots">
                                    {slots.slice(0, Math.floor(playerCount / 2)).reverse().map((slot) => (
                                        <PlayerSlot data={data} slot={slot} game={this}/>))}
                                </div>
                                <div className="middle-slots">
                                    <div className="recon-tiles">
                                        <div className="recon-tiles-row">
                                            {data.reconTiles.slice(0, 3).map((tile) =>
                                                (<ReconTile data={data} tileId={data.reconTiles.indexOf(tile)}
                                                            game={this} tile={tile}/>))}
                                        </div>
                                        <div className="recon-tiles-row">
                                            {data.reconTiles.slice(3, 6).map((tile) =>
                                                (<ReconTile data={data} tileId={data.reconTiles.indexOf(tile)}
                                                            game={this} tile={tile}/>))}
                                            {data.reconTiles[6] !== undefined
                                                ? (<div className="recon-tile-additional">
                                                    <ReconTile data={data} tileId={6} game={this}
                                                               tile={data.reconTiles[6]}/>
                                                </div>)
                                                : ""}
                                        </div>
                                    </div>
                                </div>
                                <div className="bottom-slots">
                                    {slots.slice(Math.floor(playerCount / 2)).map((slot) => (
                                        <PlayerSlot data={data} slot={slot} game={this}/>))}
                                </div>
                            </div>
                            {data.master !== null && (data.teamsLocked || data.phase !== 0) ? (
                                <div className="master-section">
                                    <PlayerSlot data={data} slot={data.master} game={this} isMaster={true}/>
                                </div>) : ""}
                            <div className="bottom-panel">
                                <div
                                    className={cs("speech-panel", {
                                        disabled: !(!isMaster && ~[3, 4].indexOf(data.phase)
                                            && (data.phase === 3 || data.currentPerson <= data.userSlot)),
                                        current: data.userSlot != null && data.currentPerson === data.userSlot
                                    })}>
                                    <div className={cs("switch", {on: wantSpeech})}
                                         onClick={() => this.handleToggleSpeech()}/>
                                    <div className="speech-panel-indicators">
                                        <div className={cs("speech-mode", "mode-on", {active: wantSpeech})}
                                             title="Мне есть, что сказать"><i className="material-icons">mic</i>
                                        </div>
                                        <div className={cs("speech-mode", "mode-off", {active: !wantSpeech})}
                                             title="Больше нечего сказать"><i className="material-icons">mic_off</i>
                                        </div>
                                    </div>
                                </div>
                                <div className="progress-panel">
                                    <div className={cs("progress", {active: data.phase === 1})}>Убийство</div>
                                    <div className={cs("progress", {active: data.phase === 2})}>Реконструкция
                                    </div>
                                    <div className="progress-round">
                                        <div
                                            className={cs("progress", {active: data.phase > 2 && data.phase < 5 && data.round === 1})}>1
                                        </div>
                                        <div
                                            className={cs("progress", {active: data.phase > 2 && data.phase < 5 && data.round === 2})}>2
                                        </div>
                                        <div
                                            className={cs("progress", {active: data.phase > 2 && data.phase < 5 && data.round === 3})}>3
                                        </div>
                                    </div>
                                    <div className={cs("progress", {active: data.phase === 3})}>Обсуждение</div>
                                    {data.personalSpeechMode ? (
                                        <div className={cs("progress", {active: data.phase === 4})}>Высказывания
                                        </div>) : ""}
                                </div>
                                {data.timed ? (<div
                                    className={cs("timer", "flip-clock", {active: data.phase !== 0 && data.timed && data.time})}>
                                    <span className="flip-clock__piece flip">
                                        <b className="flip-clock__card clock-card">
                                            <b className="card__top">{this.minutes}</b>
                                            <b className="card__bottom" data-value={this.minutes}/>
                                            <b className="card__back" data-value={this.minutes}>
                                                <b className="card__bottom" data-value={this.minutes}/>
                                            </b>
                                        </b>
                                    </span>
                                    <span className="flip-clock__piece flip">
                                        <b className="flip-clock__card clock-card">
                                            <b className="card__top">{this.seconds}</b>
                                            <b className="card__bottom" data-value={this.seconds}/>
                                            <b className="card__back" data-value={this.seconds}>
                                                <b className="card__bottom" data-value={this.seconds}/>
                                            </b>
                                        </b>
                                    </span>
                                </div>) : ""}
                            </div>
                            <div className="help-panel" onTouchStart={(e) => e.target.focus()}>
                                <i className="material-icons">help</i>
                                <div className="status-message">{status}</div>
                            </div>
                            <div
                                className={cs("spectators-section", {active: data.spectators.length > 0 || !data.teamsLocked})}>
                                <Spectators data={this.state}
                                            handleSpectatorsClick={() => this.handleSpectatorsClick()}
                                            handleRemovePlayer={(id, evt) => this.handleRemovePlayer(id, evt)}
                                            handleGiveHost={(id, evt) => this.handleGiveHost(id, evt)}/>
                            </div>
                            {data.phase === 0 && !data.spectators.includes(data.userId) ? (
                                <div className="want-master-section" onClick={() => this.toggleWantMaster()}>
                                    <div className="want-master-title">Хочу слот Криминалиста:</div>
                                    <div className="want-master-list">
                                        {data.wantMasterList.length ? data.wantMasterList.map((it) => (<div>
                                            {data.playerNames[it]}
                                        </div>)) : "..."}
                                    </div>
                                </div>) : ""}
                            <div className="host-controls" onTouchStart={(e) => e.target.focus()}>
                                {data.timed ? (<div className="host-controls-menu">
                                    <div className="little-controls">
                                        <div className="game-settings little-controls">
                                            <div className="set-master-time"><i title="Фаза преступления"
                                                                                className="material-icons">alarm_add</i>
                                                {(isHost && !inProcess) ? (<input id="goal"
                                                                                  type="number"
                                                                                  value={this.state.crimeTime}
                                                                                  min="0"
                                                                                  onChange={evt => !isNaN(evt.target.valueAsNumber)
                                                                                      && this.handleChangeParam(evt.target.valueAsNumber, "crime")}
                                                />) : (<span className="value">{this.state.crimeTime}</span>)}
                                            </div>
                                            <div className="set-team-time"><i title="Фаза реконструкции"
                                                                              className="material-icons">alarm</i>
                                                {(isHost && !inProcess) ? (<input id="round-time"
                                                                                  type="number"
                                                                                  value={this.state.masterTime}
                                                                                  min="0"
                                                                                  onChange={evt => !isNaN(evt.target.valueAsNumber)
                                                                                      && this.handleChangeParam(evt.target.valueAsNumber, "master")}
                                                />) : (<span className="value">{this.state.masterTime}</span>)}
                                            </div>
                                            <div className="set-add-time"><i title="Фаза обсуждения"
                                                                             className="material-icons">alarm_on</i>
                                                {(isHost && !inProcess) ? (<input id="round-time"
                                                                                  type="number"
                                                                                  value={this.state.commonTime}
                                                                                  min="0"
                                                                                  onChange={evt => !isNaN(evt.target.valueAsNumber)
                                                                                      && this.handleChangeParam(evt.target.valueAsNumber, "common")}
                                                />) : (<span className="value">{this.state.commonTime}</span>)}
                                            </div>
                                            <div className="set-add-time"><i
                                                title={data.personalSpeechMode ? "Фаза высказываний" : "Последняя фаза обсуджения"}
                                                className="material-icons">{data.personalSpeechMode ? "timer" : "alarm_on"}</i>
                                                {(isHost && !inProcess) ? (<input id="round-time"
                                                                                  type="number"
                                                                                  value={this.state.personTime}
                                                                                  min="0"
                                                                                  onChange={evt => !isNaN(evt.target.valueAsNumber)
                                                                                      && this.handleChangeParam(evt.target.valueAsNumber, "person")}
                                                />) : (<span className="value">{this.state.personTime}</span>)}
                                            </div>
                                            <div className="set-cards-size"><i
                                                title="Количество карт"
                                                className="material-icons">filter_none</i>
                                                {(isHost && !inProcess) ? (<input id="cards-size"
                                                                                  type="number"
                                                                                  value={this.state.nextGameCardsSize}
                                                                                  min="4"
                                                                                  max="6"
                                                                                  onChange={evt => !isNaN(evt.target.valueAsNumber)
                                                                                      && this.handleChangeParam(evt.target.valueAsNumber, "cards-size")}
                                                />) : (<span className="value">{this.state.nextGameCardsSize}</span>)}
                                            </div>
                                        </div>
                                    </div>
                                </div>) : ""}
                                <div className="side-buttons">
                                    {this.state.userId === this.state.hostId ?
                                        <i onClick={() => this.socket.emit("set-room-mode", false)}
                                           className="material-icons exit settings-button">store</i> : ""}
                                    <i onClick={() => this.openRules()}
                                       className="material-icons settings-button">help_outline</i>
                                    {(isHost && data.paused) ? (!data.timed
                                        ? (<i onClick={() => this.handleToggleTimed()}
                                              className="material-icons start-game settings-button">alarm_off</i>)
                                        : (<i onClick={() => this.handleToggleTimed()}
                                              className="material-icons start-game settings-button">alarm</i>)) : ""}
                                    {(isHost && data.paused && data.phase !== 0)
                                        ? (<i onClick={() => this.handleClickStop()}
                                              className="toggle-theme material-icons settings-button">stop</i>) : ""}
                                    {(isHost && data.phase === 0)
                                        ? (data.personalSpeechMode
                                            ? (<i onClick={() => this.handleToggleSpeechMode()}
                                                  className="material-icons start-game settings-button">record_voice_over</i>)
                                            : (<i onClick={() => this.handleToggleSpeechMode()}
                                                  className="material-icons start-game settings-button">voice_over_off</i>)) : ""}
                                    {(isHost && data.phase === 0)
                                        ? (data.simpleLocations
                                            ? (<i onClick={() => this.handleToggleSimpleLocations()}
                                                  className="material-icons start-game settings-button">location_off</i>)
                                            : (<i onClick={() => this.handleToggleSimpleLocations()}
                                                  className="material-icons start-game settings-button">location_on</i>)) : ""}
                                    {(isHost && data.phase === 0)
                                        ? (!data.disableWitness
                                            ? (<i onClick={() => this.handleToggleDisableWitness()}
                                                  className="material-icons start-game settings-button">visibility</i>)
                                            : (<i onClick={() => this.handleToggleDisableWitness()}
                                                  className="material-icons start-game settings-button">visibility_off</i>)) : ""}
                                    {(isHost && data.paused) ? (data.teamsLocked
                                        ? (<i onClick={() => this.handleToggleTeamLockClick()}
                                              className="material-icons start-game settings-button">lock_outline</i>)
                                        : (<i onClick={() => this.handleToggleTeamLockClick()}
                                              className="material-icons start-game settings-button">lock_open</i>)) : ""}
                                    {(isHost && (data.timed || data.phase === 0)) ? (!inProcess
                                        ? (<i onClick={() => this.handleClickTogglePause()}
                                              title={notEnoughPlayers ? "Недостаточно игроков" : ""}
                                              className={`material-icons start-game settings-button ${notEnoughPlayers
                                                  ? "inactive" : ""}`}>play_arrow</i>)
                                        : (<i onClick={() => this.handleClickTogglePause()}
                                              className="material-icons start-game settings-button">pause</i>)) : ""}
                                    <i onClick={() => this.handleClickChangeName()}
                                       className="toggle-theme material-icons settings-button">edit</i>
                                    {!this.isMuted()
                                        ? (<i onClick={() => this.handleToggleMuteSounds()}
                                              className="toggle-theme material-icons settings-button">volume_up</i>)
                                        : (<i onClick={() => this.handleToggleMuteSounds()}
                                              className="toggle-theme material-icons settings-button">volume_off</i>)}
                                </div>
                                <i className="settings-hover-button material-icons">settings</i>
                                <input id="avatar-input" type="file" onChange={evt => this.handleSetAvatar(evt)}/>
                            </div>
                            <CommonRoom state={this.state} app={this}/>
                        </div>
                    </div>
                );
            } else return (<div/>);
        } catch (error) {
            console.error(error);
            debugger;
            return (<div
                className="kicked">{`Client error: ${error.message}`}</div>);
        }
    }
}

ReactDOM.render(<Game/>, document.getElementById('root'));
