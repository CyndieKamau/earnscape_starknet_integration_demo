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
import { fmt } from "@/constants/rewards";

export default function WithdrawScreen() {
  const { user, login } = useGlobalContext();
  const [amountInput, setAmountInput] = useState<string>("");
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

  const availableEarns = user?.earnsClaimed ?? 0;
  const walletDeployed = user?.walletDeployed ?? false;
  const starknetAddress = user?.starknetAddress ?? "—";

  const cleanAmount = (raw: string) => {
    const n = parseFloat(raw.replace(/[^\d.]/g, ""));
    return Number.isFinite(n) ? n : 0;
  };

  const amount = useMemo(() => cleanAmount(amountInput), [amountInput]);
  const hasEnough = amount > 0 && amount <= availableEarns;
  const valid = hasEnough;

  const setMax = () => setAmountInput(String(fmt(availableEarns)));

  const submit = async () => {
    if (!valid || !user) return;
    setSubmitting(true);

    // Mock network + deduction
    setTimeout(async () => {
      const updated = {
        ...user,
        earnsClaimed: user.earnsClaimed - amount,
      };
      await login(updated);
      setSubmitting(false);
      setSuccess(true);

      successScale.setValue(0);
      Animated.spring(successScale, { toValue: 1, useNativeDriver: true, friction: 6 }).start();
      setAmountInput("");
    }, 900);
  };

  return (
    <SafeAreaView className="bg-dark h-full">
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Animated.View style={{ opacity: fade, transform: [{ scale }] }}>
          {/* Header */}
          <View className="mb-6">
            <Text className="text-3xl font-rubik-extrabold text-primary">
              Withdraw EARNS
            </Text>
            <Text className="text-base font-rubik text-text-secondary mt-1">
              Transfer your EARNS tokens to your wallet
            </Text>
          </View>

          {/* Balances */}
          <View className="flex-row gap-3 mb-6">
            <BalanceCard
              label="Available EARNS"
              value={fmt(availableEarns)}
              sub="Ready to withdraw"
            />
            <BalanceCard
              label="Wallet"
              value={walletDeployed ? mask(starknetAddress) : "Not deployed"}
              sub="Destination"
            />
          </View>

          {/* Input */}
          <View className="bg-dark-50 rounded-2xl border border-dark-200 p-4 mb-4">
            <Text className="text-sm text-text-secondary font-rubik mb-2">
              Enter amount to withdraw
            </Text>

            <View className="flex-row items-center bg-dark-200 rounded-xl px-4">
              <TextInput
                keyboardType="decimal-pad"
                inputMode="decimal"
                placeholder="0.00"
                value={amountInput}
                onChangeText={setAmountInput}
                className="flex-1 py-4 text-white font-rubik-semibold text-xl"
                placeholderTextColor="#808080"
              />
              <TouchableOpacity onPress={setMax} className="bg-primary/20 px-3 py-1.5 rounded-lg">
                <Text className="text-primary font-rubik-semibold">MAX</Text>
              </TouchableOpacity>
            </View>

            {/* Validation */}
            {!hasEnough && amount > 0 && (
              <Text className="text-red-400 mt-2 font-rubik">
                You only have {fmt(availableEarns)} EARNS.
              </Text>
            )}
          </View>

          {/* Preview */}
          <View className="bg-dark-50 rounded-2xl border border-dark-200 p-4 mb-6">
            <Text className="text-white font-rubik-semibold mb-3">Preview</Text>
            <Row label="Withdraw amount" value={`${fmt(amount)} EARNS`} />
            <Row label="Destination" value={walletDeployed ? mask(starknetAddress) : "Not deployed"} />
            <Row label="Network fee" value="0 (covered)" />

            {!walletDeployed && (
              <Text className="text-yellow-400 mt-2 font-rubik">
                Wallet will deploy on first withdrawal.
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
              {submitting ? "Processing..." : "Confirm Withdraw"}
            </Text>
          </TouchableOpacity>

          {/* Success */}
          {success && (
            <Animated.View style={{ transform: [{ scale: successScale }] }} className="mt-6 items-center">
              <View className="w-16 h-16 rounded-full bg-primary/20 items-center justify-center border border-primary/40">
                <Text className="text-2xl">💸</Text>
              </View>
              <Text className="text-white font-rubik-semibold mt-3">
                Withdrawal successful!
              </Text>
            </Animated.View>
          )}

          <Text className="text-xs text-text-muted text-center mt-8">
            Withdrawals are mocked until backend is connected.
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