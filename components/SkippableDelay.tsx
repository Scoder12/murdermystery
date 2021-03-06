import { Button, Flex, useTimeout } from "@chakra-ui/react";
import { STRINGS, useTranslator } from "lib/translate";
import { FC } from "react";
import LinearProgressCircle from "./LinearProgressCircle";

export interface SkippableDelayProps {
  duration: number;
  onDone?: () => void;
  circleColor?: string;
}

const SkippableDelay: FC<SkippableDelayProps> = ({
  duration,
  onDone = () => undefined,
  circleColor = "gray.300",
}: SkippableDelayProps) => {
  const t = useTranslator();

  useTimeout(() => {
    onDone();
  }, duration * 1000);

  return (
    <Button colorScheme="blue" onClick={onDone}>
      <LinearProgressCircle duration={duration} size={40} color={circleColor} />
      <>{t(STRINGS.SKIP)}</>
    </Button>
  );
};

export default SkippableDelay;

export const RightFloatSkippableDelay: FC<SkippableDelayProps> = (
  props: SkippableDelayProps
) => {
  return (
    <Flex justifyContent="flex-end">
      {/* eslint-disable-next-line react/jsx-props-no-spreading */}
      <SkippableDelay {...props} />
    </Flex>
  );
};
