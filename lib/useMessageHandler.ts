import { murdermystery as protobuf } from "pbjs/protobuf";
import { useRef, useState } from "react";
import { STRINGS } from "./translate";

export interface PlayerIDMap {
  [id: string]: protobuf.Players.IPlayer;
}

export interface AlertContent {
  title: STRINGS;
  body: STRINGS;
}

// Typing this function's return would be too complicated, plus it only returns once
//  and the type can be inferred.
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export default function useMessageHandler(
  onError: (msg: STRINGS) => void,
  onGameOver: () => void
) {
  // Our player ID
  // Set to -2 so it is different from spectator ID of -1, otherwise we will never
  //  re-render as a spectator
  const [playerID, setPlayerID] = useState<number>(-2);
  // Are we the host? Used to determine whether "Start Game" is enabled on Lobby
  const [isHost, setIsHost] = useState<boolean>(false);
  // The players we know of. Server will sync these with us whever they update.
  const [players, setPlayers] = useState<PlayerIDMap>({});
  // Who the host is. Used for showing the "Host" badge next to them in the lobby
  const [hostId, setHostId] = useState<number>(-1);
  // If set, a modal will pop with alertContent and then it will be cleared.
  // Server will tell us when to set this
  const [alertContent, setAlertContent] = useState<AlertContent | null>(null);
  // Our character. Used by the spinner.
  const [character, setCharacter] = useState<protobuf.Character>(
    protobuf.Character.NONE
  );
  // Whether the character spinner is done
  const [spinDone, setSpinDone] = useState<boolean>(false);
  // Fellow wolves. Shown to the player after character spinner.
  const [fellowWolves, setFellowWolves] = useState<number[]>([]);
  // Whether the fellow wolves screen still needs to be shown
  const [showFellowWolves, setShowFellowWolves] = useState<boolean>(false);
  // Current vote to be shown to the user.
  const [voteRequest, setVoteRequest] = useState<protobuf.IVoteRequest | null>(
    null
  );
  // Result of a vote, reset to null after timeout
  const [voteResult, setVoteResult] = useState<
    protobuf.VoteResult.ICandidateResult[] | null
  >(null);
  // Current vote type
  const [voteType, setVoteType] = useState<protobuf.VoteRequest.Type>(0);
  // Prophet reveal screen
  const [
    prophetReveal,
    setProphetReveal,
  ] = useState<protobuf.IProphetReveal | null>(null);
  // The kill revealed to the healer
  const [killReveal, setKillReveal] = useState<number[] | null>(null);
  const [gameIsOver, setGameIsOver] = useState<boolean>(false);
  const gameOverRef = useRef<protobuf.IGameOver | null>(null);
  const [alive, setAlive] = useState<number[] | null>(null);
  const [spectatorUpdates, setSpectatorUpdates] = useState<
    protobuf.ISpectatorUpdate[] | null
  >(null);
  const [killed, setKilled] = useState<protobuf.IKilled | null>(null);

  // Message handlers
  function handleHost(msg: protobuf.IHost) {
    setIsHost(!!msg.isHost);
  }

  function handlePlayers(msg: protobuf.IPlayers) {
    const newPlayers: PlayerIDMap = {};
    (msg.players || []).forEach((p) => {
      if (p.id && p.name) {
        newPlayers[p.id] = p;
      }
    });
    setPlayers(newPlayers);
    setHostId(msg.hostId || -1);
  }

  function handleError(err: protobuf.IError) {
    let error = STRINGS.ERROR;
    if (err.msg === protobuf.Error.E_type.BADNAME) {
      error = STRINGS.INVALID_NAME;
    } else if (err.msg === protobuf.Error.E_type.DISCONNECT) {
      error = STRINGS.PLAYER_DISCONNECTED;
    }
    onError(error);
  }

  function handleAlert(data: protobuf.IAlert) {
    let error = STRINGS.ERROR_PERFORMING_ACTION;
    if (data.msg === protobuf.Alert.Msg.NEEDMOREPLAYERS) {
      error = STRINGS.NEED_MORE_PLAYERS;
    }
    // TODO: Maybe allow for different alert titles, but so far haven't used any others
    setAlertContent({
      title: STRINGS.YOU_CANT_START,
      body: error,
    });
  }

  function handleSetCharacter(msg: protobuf.ISetCharacter) {
    msg.character && setCharacter(msg.character);
  }

  function handleHandshake(msg: protobuf.IHandshake) {
    if (msg.status !== protobuf.Handshake.Status.OK) {
      onError(STRINGS.ERROR);
    }
    if (msg.id) {
      setPlayerID(msg.id);
    }
  }

  function handleFellowWolves(msg: protobuf.IFellowWolves) {
    setFellowWolves(msg.ids || []);
    setShowFellowWolves(true);
  }

  function handleVoteRequest(msg: protobuf.IVoteRequest) {
    if (msg.choice_IDs) {
      setVoteRequest(msg);
      setVoteType(msg.type || 0);
    }
  }

  function handleVoteOver(msg: protobuf.IVoteOver) {
    // Clear vote data
    setVoteRequest(null);
    if (killReveal != null) {
      setKillReveal(null);
    }
    if (msg.result && msg.result.candidates) {
      setVoteResult(msg.result.candidates);
    }
  }

  function handleProphetReveal(msg: protobuf.IProphetReveal) {
    setProphetReveal(msg);
  }

  function handlerHealerKillReveal(msg: protobuf.IKillReveal) {
    if (msg.killed_IDs) {
      setKillReveal(msg.killed_IDs);
    }
  }

  function handleGameOver(msg: protobuf.IGameOver) {
    gameOverRef.current = msg;
    setGameIsOver(true);
    onGameOver();
  }

  function handlePlayerStatus(msg: protobuf.IPlayerStatus) {
    setAlive(msg.alive || []);
  }

  function handleSpectatorUpdate(msg: protobuf.ISpectatorUpdate) {
    setSpectatorUpdates((prevUpdates) => (prevUpdates || []).concat([msg]));
  }

  function handleBulkSpectatorUpdate(msg: protobuf.IBulkSpectatorUpdate) {
    setSpectatorUpdates((prevUpdates) =>
      (prevUpdates || []).concat(msg.update || [])
    );
  }

  function handleKilled(msg: protobuf.IKilled) {
    setKilled(msg);
  }

  // Call the proper handler based on the ServerMessage.
  // Protobuf guarantees only one of these cases will be true due to `oneof`, so this
  //  is the best way to call the correct handler.
  const callHandler = (msg: protobuf.IServerMessage) => {
    if (msg.handshake) return handleHandshake(msg.handshake);
    if (msg.host) return handleHost(msg.host);
    if (msg.players) return handlePlayers(msg.players);
    if (msg.error) return handleError(msg.error);
    if (msg.alert) return handleAlert(msg.alert);
    if (msg.setCharacter) return handleSetCharacter(msg.setCharacter);
    if (msg.fellowWolves) return handleFellowWolves(msg.fellowWolves);
    if (msg.voteRequest) return handleVoteRequest(msg.voteRequest);
    if (msg.voteOver) return handleVoteOver(msg.voteOver);
    if (msg.prophetReveal) return handleProphetReveal(msg.prophetReveal);
    if (msg.killReveal) return handlerHealerKillReveal(msg.killReveal);
    if (msg.gameOver) return handleGameOver(msg.gameOver);
    if (msg.playerStatus) return handlePlayerStatus(msg.playerStatus);
    if (msg.spectatorUpdate) return handleSpectatorUpdate(msg.spectatorUpdate);
    if (msg.bulkSpectatorUpdate)
      return handleBulkSpectatorUpdate(msg.bulkSpectatorUpdate);
    if (msg.killed) return handleKilled(msg.killed);
    throw new Error("Not implemented. ");
  };

  // Process a message from the websocket.
  const parseMessage = (ev: MessageEvent) => {
    let msg: protobuf.IServerMessage;
    try {
      msg = protobuf.ServerMessage.decode(new Uint8Array(ev.data));
      // eslint-disable-next-line no-console
      console.log("↓", msg);
      callHandler(msg);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("Message decode error:", e);
    }
  };

  return {
    // Message Parser
    parseMessage,
    // State variables
    playerID,
    isHost,
    players,
    hostId,
    alertContent,
    character,
    spinDone,
    setSpinDone,
    fellowWolves,
    showFellowWolves,
    voteRequest,
    voteResult,
    voteType,
    prophetReveal,
    killReveal,
    gameIsOver,
    gameOverRef,
    alive,
    spectatorUpdates,
    killed,
    // State setters
    setShowFellowWolves,
    setProphetReveal,
    setAlertContent,
    setVoteResult,
    setAlive,
    setKilled,
  };
}
