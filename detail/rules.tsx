import { Box, Text } from "gloomberb/ui";
import { colors } from "gloomberb/theme";

export function PredictionMarketRulesView({
  rules,
  detailWidth,
  loading = false,
  failed = false,
}: {
  rules: string[];
  detailWidth: number;
  loading?: boolean;
  failed?: boolean;
}) {
  const textWidth = Math.max(detailWidth, 12);
  if (loading) {
    return <Text fg={colors.textDim}>Loading rules.</Text>;
  }
  if (failed) {
    return <Text fg={colors.textDim}>Rules unavailable.</Text>;
  }

  return (
    <Box flexDirection="column" gap={1}>
      {rules.map((rule, index) => (
        <Box
          key={`${index}:${rule.slice(0, 24)}`}
          flexDirection="column"
          width={textWidth}
        >
          <Text fg={colors.text} width={textWidth} wrapMode="word" wrapText>
            {rule}
          </Text>
        </Box>
      ))}
      {rules.length === 0 && (
        <Text fg={colors.textDim}>No rule text returned by the venue.</Text>
      )}
    </Box>
  );
}
