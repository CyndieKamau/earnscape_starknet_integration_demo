import React, { useMemo, useRef, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Animated,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useGlobalContext } from "@/lib/global-provider";
import { CLAIM_COPY, REWARD_CONVERSION, fmt, pointsToEarns } from "@/constants/rewards";

export default function ClaimScreen() {
  const { user, login } = useGlobalContext(); // reuse login to persist updated user
  const [pointsInput, setPointsInput] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const fade = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.9)).current;
  const successScale = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 7, tension: 40, useNativeDriver: true }),
    ]).start();
  }, [fade, scale]);

  const availablePoints = user?.rewardPoints ?? 0;
  const walletDeployed = user?.walletDeployed ?? false;
  const starknetAddress = user?.starknetAddress ?? "—";

  // sanitize input
  const cleanPoints = (raw: string) => {
    const n = parseInt(raw.replace(/[^\d]/g, ""), 10);
    return Number.isFinite(n) ? n : 0;
  };

  const points = useMemo(() => cleanPoints(pointsInput), [pointsInput]);
  const earns = useMemo(() => pointsToEarns(points), [points]);

  const hasEnough = points > 0 && points <= availablePoints;
  const meetsMin = points >= REWARD_CONVERSION.MIN_POINTS;
  const valid = hasEnough && meetsMin;

  const setMax = () => setPointsInput(String(availablePoints));

  const submit = async () => {
    if (!valid || !user) return;
    setSubmitting(true);

    // fake network
    setTimeout(async () => {
      // Update local "DB": decrease points, increase cumulative claimed
      const updated = {
        ...user,
        rewardPoints: user.rewardPoints - points,
        earnsClaimed: (user.earnsClaimed || 0) + earns,
      };

      await login(updated); // persist over the AsyncStorage key you already use
      setSubmitting(false);
      setSuccess(true);

      // tiny checkmark pop
      successScale.setValue(0);
      Animated.spring(successScale, { toValue: 1, useNativeDriver: true, friction: 6 }).start();

      // reset input
      setPointsInput("");
    }, 900);
  };

  return (
    <SafeAreaView className="bg-dark h-full">
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Animated.View style={{ opacity: fade, transform: [{ scale }] }}>
          {/* Header */}
          <View className="mb-6">
            <Text className="text-3xl font-rubik-extrabold text-primary">
              {CLAIM_COPY.title}
            </Text>
            <Text className="text-base font-rubik text-text-secondary mt-1">
              {CLAIM_COPY.subtitle}
            </Text>
          </View>

          {/* Balances */}
          <View className="flex-row gap-3 mb-6">
            <BalanceCard
              label="Your Points"
              value={String(availablePoints)}
              sub="Available"
            />
            <BalanceCard
              label="EARNS (claimed)"
              value={fmt(user?.earnsClaimed ?? 0)}
              sub="Lifetime"
            />
          </View>

          {/* Input */}
          <View className="bg-dark-50 rounded-2xl border border-dark-200 p-4 mb-4">
            <Text className="text-sm text-text-secondary font-rubik mb-2">
              Enter points to convert
            </Text>

            <View className="flex-row items-center bg-dark-200 rounded-xl px-4">
              <TextInput
                keyboardType="number-pad"
                inputMode="numeric"
                placeholder="0"
                value={pointsInput}
                onChangeText={setPointsInput}
                className="flex-1 py-4 text-white font-rubik-semibold text-xl"
                placeholderTextColor="#808080"
              />
              <TouchableOpacity onPress={setMax} className="bg-primary/20 px-3 py-1.5 rounded-lg">
                <Text className="text-primary font-rubik-semibold">MAX</Text>
              </TouchableOpacity>
            </View>

            {/* Calculator */}
            <View className="flex-row items-center justify-between mt-3">
              <Text className="text-text-secondary font-rubik">
                Rate: {REWARD_CONVERSION.POINTS_PER_EARNS} pts = 1 EARNS
              </Text>
              <Text className="text-text-primary font-rubik-semibold">
                {fmt(earns)} EARNS
              </Text>
            </View>

            {/* Validation */}
            {!hasEnough && points > 0 && (
              <Text className="text-red-400 mt-2 font-rubik">
                You only have {availablePoints} points.
              </Text>
            )}
            {!meetsMin && points > 0 && (
              <Text className="text-yellow-400 mt-1 font-rubik">
                Minimum claim is {REWARD_CONVERSION.MIN_POINTS} points.
              </Text>
            )}
          </View>

          {/* Preview */}
          <View className="bg-dark-50 rounded-2xl border border-dark-200 p-4 mb-6">
            <Text className="text-white font-rubik-semibold mb-3">Preview</Text>

            <Row label="You convert" value={`${points || 0} pts`} />
            <Row label="You receive" value={`${fmt(earns)} EARNS`} />
            <Row label="Gas" value="0 (covered)" />
            <Row label="Wallet" value={walletDeployed ? mask(starknetAddress) : "Not deployed"} />

            {!walletDeployed && (
              <Text className="text-yellow-400 mt-2 font-rubik">
                Wallet will be deployed on first onchain action.
              </Text>
            )}
          </View>

          {/* Confirm */}
          <TouchableOpacity
            onPress={submit}
            disabled={!valid || submitting}
            className={`rounded-2xl py-4 items-center ${
              !valid || submitting ? "bg-primary/40" : "bg-primary"
            }`}
          >
            <Text className="text-dark font-rubik-semibold text-base">
              {submitting ? "Processing..." : "Confirm Claim"}
            </Text>
          </TouchableOpacity>

          {/* Success */}
          {success && (
            <Animated.View
              style={{
                transform: [{ scale: successScale }],
              }}
              className="mt-6 items-center"
            >
              <View className="w-16 h-16 rounded-full bg-primary/20 items-center justify-center border border-primary/40">
                <Text className="text-2xl">✅</Text>
              </View>
              <Text className="text-white font-rubik-semibold mt-3">
                Claim successful!
              </Text>
            </Animated.View>
          )}

          {/* Footer note */}
          <Text className="text-xs text-text-muted text-center mt-8">
            Claims are mocked until backend is connected.
          </Text>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

function BalanceCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <View className="flex-1 bg-dark-50 rounded-2xl border border-dark-200 p-4">
      <Text className="text-text-secondary font-rubik text-xs">{label}</Text>
      <Text className="text-white font-rubik-extrabold text-2xl mt-1">{value}</Text>
      <Text className="text-text-muted font-rubik text-xs mt-1">{sub}</Text>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between py-2">
      <Text className="text-text-secondary font-rubik">{label}</Text>
      <Text className="text-white font-rubik-semibold">{value}</Text>
    </View>
  );
}

const mask = (addr: string) =>
  addr && addr.length > 12 ? `${addr.slice(0, 6)}…${addr.slice(-6)}` : addr || "—";