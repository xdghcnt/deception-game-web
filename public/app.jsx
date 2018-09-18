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
        this.socket = window.socket.of("who-am-i");
        this.socket.on("state", state => this.setState(Object.assign({
            userId: this.userId
        }, state)));
        this.socket.on("roles", (player, word) => {
            if (this.userId !== player)
                document.getElementById(player).value = word;
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
        ;
        this.socket.on("prompt-delete-prev-room", (roomList) => {
            if (localStorage.acceptDelete =
                prompt(`Limit for hosting rooms per IP was reached: ${roomList.join(", ")}. Delete one of rooms?`, roomList[0]))
                location.reload();
        });
        this.socket.on("ping", (id) => {
            this.socket.emit("pong", id);
        });
        setTimeout(() => document.getElementById("background").classList.add("blurred"), 1500);
    }

    constructor() {
        super();
        this.state = {
            inited: false
        };
    }

    handleRoleChange(id, value) {
        this.socket.emit("change-word", id, value);
    }

    handleNotesChange(id, value) {
        this.socket.emit("change-notes", id, value);
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

    handleSpectatorsClick() {
        this.socket.emit("spectators-join");
    }

    handlePlayersClick() {
        this.socket.emit("players-join");
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
                uri = "/who-am-i/upload-avatar",
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

    render() {
        if (this.state.disconnected)
            return (<div
                className="kicked">Disconnected{this.state.disconnectReason ? ` (${this.state.disconnectReason})` : ""}</div>);
        else if (this.state.inited) {
            const
                data = this.state,
                isHost = data.hostId === data.userId,
                isPlayer = !!~data.players.indexOf(data.userId),
                parentDir = location.pathname.match(/(.+?)\//)[1];
            return (
                <div className="game">
                    <div id="background"/>
                    <div className={
                        "game-board"
                        + (this.state.inited ? " active" : "")
                    }>
                        <div className="slot-list">
                            {data.playerSlots.map(player => (
                                <div className="slot-container">
                                    {player === data.userId
                                        ? (<div className="set-avatar-button">
                                            <i onClick={() => this.handleClickSetAvatar()}
                                               className="toggle-theme material-icons settings-button">edit</i>
                                        </div>)
                                        : ""}
                                    <div className="avatar"
                                         style={{
                                             "background-image": `url(/who-am-i/${data.playerAvatars[player]
                                                 ? `avatars/${player}/${data.playerAvatars[player]}.png`
                                                 : "default-user.png"})`
                                         }}/>
                                    <Player id={player} data={data}
                                            handleRemovePlayer={(id, evt) => this.handleRemovePlayer(id, evt)}
                                            handleGiveHost={(id, evt) => this.handleGiveHost(id, evt)}/>
                                </div>
                            ))}
                        </div>
                        <div className={
                            "spectators-section"
                            + ((data.spectators.length > 0 || !data.teamsLocked) ? " active" : "")
                        }>
                            <Spectators data={this.state}
                                        handleSpectatorsClick={() => this.handleSpectatorsClick()}
                                        handleRemovePlayer={(id, evt) => this.handleRemovePlayer(id, evt)}
                                        handleGiveHost={(id, evt) => this.handleGiveHost(id, evt)}/>
                        </div>
                        <div className="host-controls">
                            {data.timed ? (<div className="host-controls-menu">
                                <div className="little-controls">
                                    <div className="game-settings">
                                        <div className="set-master-time"><i title="crime time"
                                                                            className="material-icons">alarm_add</i>
                                            {(isHost && !inProcess) ? (<input id="goal"
                                                                              type="number"
                                                                              defaultValue={this.state.masterTime}
                                                                              min="0"
                                                                              onChange={evt => !isNaN(evt.target.valueAsNumber)
                                                                                  && this.handleChangeTime(evt.target.valueAsNumber, "masterTime")}
                                            />) : (<span className="value">{this.state.masterTime}</span>)}
                                        </div>
                                        <div className="set-team-time"><i title="master time"
                                                                          className="material-icons">alarm</i>
                                            {(isHost && !inProcess) ? (<input id="round-time"
                                                                              type="number"
                                                                              defaultValue={this.state.teamTime} min="0"
                                                                              onChange={evt => !isNaN(evt.target.valueAsNumber)
                                                                                  && this.handleChangeTime(evt.target.valueAsNumber, "teamTime")}
                                            />) : (<span className="value">{this.state.teamTime}</span>)}
                                        </div>
                                        <div className="set-add-time"><i title="common time"
                                                                         className="material-icons">alarm_on</i>
                                            {(isHost && !inProcess) ? (<input id="round-time"
                                                                              type="number"
                                                                              defaultValue={this.state.votingTime}
                                                                              min="0"
                                                                              onChange={evt => !isNaN(evt.target.valueAsNumber)
                                                                                  && this.handleChangeTime(evt.target.valueAsNumber, "votingTime")}
                                            />) : (<span className="value">{this.state.votingTime}</span>)}
                                        </div>
                                        <div className="set-add-time"><i title="personal time"
                                                                         className="material-icons">alarm_on</i>
                                            {(isHost && !inProcess) ? (<input id="round-time"
                                                                              type="number"
                                                                              defaultValue={this.state.votingTime}
                                                                              min="0"
                                                                              onChange={evt => !isNaN(evt.target.valueAsNumber)
                                                                                  && this.handleChangeTime(evt.target.valueAsNumber, "votingTime")}
                                            />) : (<span className="value">{this.state.votingTime}</span>)}
                                        </div>
                                    </div>
                                </div>
                            </div>) : ""}
                            <div className="side-buttons">
                                <i onClick={() => window.location = parentDir}
                                   className="material-icons exit settings-button">exit_to_app</i>
                                {isHost && !data.loadingCards ? (!inProcess
                                    ? (<i onClick={() => this.handleClickTogglePause()}
                                          className="material-icons start-game settings-button">play_arrow</i>)
                                    : (<i onClick={() => this.handleClickTogglePause()}
                                          className="material-icons start-game settings-button">pause</i>)) : ""}
                                {(isHost && data.paused && !data.loadingCards) ? (data.teamsLocked
                                    ? (<i onClick={() => this.handleToggleTeamLockClick()}
                                          className="material-icons start-game settings-button">lock_outline</i>)
                                    : (<i onClick={() => this.handleToggleTeamLockClick()}
                                          className="material-icons start-game settings-button">lock_open</i>)) : ""}
                                {(isHost && data.paused && !data.loadingCards) ? (!data.timed
                                    ? (<i onClick={() => this.handleToggleTimed()}
                                          className="material-icons start-game settings-button">alarm_off</i>)
                                    : (<i onClick={() => this.handleToggleTimed()}
                                          className="material-icons start-game settings-button">alarm</i>)) : ""}
                                {(isHost && data.paused && !data.loadingCards)
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
    }
}

ReactDOM.render(<Game/>, document.getElementById('root'));
