import { Badge, Button, Flex, Heading, Text } from "@chakra-ui/react";
import { FC } from "react";
import { STRINGS, useTranslator } from "../lib/translate";
import { murdermystery as protobuf } from "../pbjs/protobuf.js";

interface LobbyProps {
  players: {
    [id: string]: protobuf.Players.IPlayer;
  };
  hostId: number;
  isHost: boolean;
  start: () => void;
}

export const Lobby: FC<LobbyProps> = ({
  players,
  isHost,
  hostId,
  start,
}: LobbyProps) => {
  const t = useTranslator();

  const hostBadge = (
    <Badge variant="outline" ml={1}>
      {t(STRINGS.HOST)}
    </Badge>
  );

  return (
    <>
      <Heading as="h3" size="lg" mb={2}>
        {t(STRINGS.WAITING_FOR_PLAYERS)}
      </Heading>
      <Flex mb={3} align="center" justify="space-between">
        <Text as="i">{t(STRINGS.SHARE_TO_INVITE)}</Text>
        <Button colorScheme="blue">{t(STRINGS.COPY)}</Button>
      </Flex>
      {/* Polish: style this a bit more, don't use <ul> */}
      <ul>
        {Object.keys(players).map((id) => {
          const p = players[id];
          if (!p || !p.name) return null;
          const pIsHost = p.id === hostId;
          return (
            <li key={p.id || p.name + pIsHost.toString()}>
              <span>{p.name}</span>
              {pIsHost && hostBadge}
            </li>
          );
        })}
      </ul>
      <Button
        colorScheme="blue"
        float="right"
        mt={10}
        isDisabled={!isHost}
        onClick={() => start()}
      >
        {isHost ? t(STRINGS.START_GAME) : t(STRINGS.WAIT_FOR_HOST)}
      </Button>
    </>
  );
};

export default Lobby;
