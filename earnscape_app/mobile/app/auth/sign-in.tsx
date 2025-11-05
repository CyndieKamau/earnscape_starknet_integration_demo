// app/(auth)/sign-in.tsx
import React, { useState, useEffect, useRef } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Animated,
} from "react-native";
import { Redirect, useRouter } from "expo-router";
import { usePrivy } from "@privy-io/expo";
import { useLogin } from "@privy-io/expo/ui";
import { useGlobalContext } from "@/lib/global-provider";

const getUserEmail = (u: unknown) =>
  (u as any)?.email?.address ??
  (u as any)?.emails?.[0]?.address ??
  (u as any)?.linkedAccounts?.find((a: any) => a.type === "email")?.address ??
  "";

const SignIn = () => {
  const router = useRouter();
  const [error, setError] = useState("");
  
  // Animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  // Privy hooks
  const { user } = usePrivy();
  const { login } = useLogin();
  const { login: saveUserLocally, isLogged, loading } = useGlobalContext();
  
  

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 8, tension: 40, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, scaleAnim]);

  useEffect(() => {
    if (user) handleSuccessfulAuth();
  }, [user]);


  const handleSuccessfulAuth = async () => {
    try {
      const userEmail = getUserEmail(user) || user?.id || "";
    
      const userData = {
        id: user!.id,
        email: userEmail,
        privyUserId: user!.id,
        starknetAddress: "",
        rewardPoints: 2000,
        earnsClaimed: 0,
        walletDeployed: false,
        createdAt: new Date().toISOString()
      };

      await saveUserLocally(userData);
      router.replace("/(root)/(tabs)");
    } catch (e) {
      console.error("Error saving user:", e);
      Alert.alert("Error", "Failed to complete authentication");
    }
  };

  // Redirect if already logged in
  if (loading) return null;
  if (isLogged || user) {
    return <Redirect href="/(root)/(tabs)" />; // <- matches your file tree
  }

  const handleEmailLogin = async () => {
    try {
      setError("");
      const session = await login({ loginMethods: ["email"] });
      console.log("User logged in", session.user);
    } catch (err: any) {
      console.error("Login error:", err);
      setError(err?.message || "Authentication failed");
      if (err?.message && !err.message.includes("cancel")) {
        Alert.alert("Error", err.message);
      }
    }
  };

  return (
    <SafeAreaView className="bg-dark h-full">
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          paddingHorizontal: 24,
        }}
      >
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          }}
        >
          {/* Logo */}
          <View className="items-center mb-12">
            <View className="w-32 h-32 rounded-full bg-primary/20 items-center justify-center mb-6">
              <View className="w-24 h-24 rounded-full bg-primary/30 items-center justify-center">
                <Text className="text-5xl font-rubik-bold text-dark">E</Text>
              </View>
            </View>

            <Text className="text-4xl font-rubik-bold text-white text-center">
              Welcome to
            </Text>
            <Text className="text-5xl font-rubik-extrabold text-primary text-center mt-2">
              Earnscape
            </Text>
            <Text className="text-base font-rubik text-text-secondary text-center mt-4 px-4">
              Select login type and start earning!
            </Text>
          </View>

          {/* Email Sign-In Button */}
          <TouchableOpacity
            onPress={handleEmailLogin}
            className="bg-primary rounded-2xl py-5 px-6 mb-4"
            activeOpacity={0.8}
          >
            <View className="bg-primary w-full py-5 px-6">
              <View className="flex-row items-center justify-center">
                <View className="w-6 h-6 items-center justify-center mr-3">
                  <Text className="text-2xl">📧</Text>
                </View>
                <Text className="text-lg font-rubik-semibold text-dark">
                  Continue with Email
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Error Message */}
          {error && (
            <View className="mb-4 bg-red-500/10 border border-red-500/30 rounded-xl p-4">
              <Text className="text-red-400 font-rubik text-center">
                {error}
              </Text>
            </View>
          )}

          {/* Features */}
          <View className="mt-12 space-y-4">
            <FeatureItem
              icon="🎮"
              title="Play & Earn"
              description="Convert gaming points to EARNS tokens"
            />
            <FeatureItem
              icon="⚡"
              title="Gasless Transactions"
              description="No fees. We cover all costs"
            />
            <FeatureItem
              icon="🔒"
              title="Secure Wallet"
              description="Auto-created & secured by Privy"
            />
          </View>

          {/* Terms */}
          <View className="mt-12 px-4">
            <Text className="text-xs font-rubik text-text-muted text-center">
              By signing up, you agree to Earnscape&apos;s{" "}
              <Text className="text-primary">Terms of Use</Text> and{" "}
              <Text className="text-primary">Privacy Policy</Text>
            </Text>
          </View>

          {/* Beta Badge */}
          <View className="mt-8 items-center">
            <View className="bg-secondary/20 px-4 py-2 rounded-full border border-secondary/40">
              <Text className="text-secondary font-rubik-semibold text-xs">
                🚀 BETA VERSION
              </Text>
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

const FeatureItem = ({ icon, title, description }: { icon: string; title: string; description: string }) => {
  return (
    <View className="flex-row items-center bg-dark-50 rounded-xl p-4 border border-dark-200">
      <View className="w-12 h-12 rounded-full bg-primary/20 items-center justify-center mr-4">
        <Text className="text-2xl">{icon}</Text>
      </View>
      <View className="flex-1">
        <Text className="text-base font-rubik-semibold text-text-primary mb-1">
          {title}
        </Text>
        <Text className="text-sm font-rubik text-text-secondary">
          {description}
        </Text>
      </View>
    </View>
  );
};

export default SignIn;