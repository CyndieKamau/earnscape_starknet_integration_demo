// // app/(auth)/sign-in.tsx
// import React, { useState, useEffect, useRef } from "react";
// import { SafeAreaView } from "react-native-safe-area-context";
// import {
//   Alert,
//   ScrollView,
//   Text,
//   TouchableOpacity,
//   View,
//   Animated,
// } from "react-native";
// import { Redirect, useRouter } from "expo-router";
// import { usePrivy, useIdentityToken } from "@privy-io/expo"; // 👈 Added useIdentityToken
// import { useLogin } from "@privy-io/expo/ui";
// import { useGlobalContext } from "@/lib/global-provider";
// import { api, setAuthToken } from "@/lib/api";

// const getUserEmail = (u: unknown) =>
//   (u as any)?.email?.address ??
//   (u as any)?.emails?.[0]?.address ??
//   (u as any)?.linkedAccounts?.find((a: any) => a.type === "email")?.address ??
//   "";

// const SignIn = () => {
//   const router = useRouter();
//   const [error, setError] = useState("");
  
//   // Animation
//   const fadeAnim = useRef(new Animated.Value(0)).current;
//   const scaleAnim = useRef(new Animated.Value(0.9)).current;

//   // Privy hooks
//   const { user } = usePrivy();
//   const { getIdentityToken } = useIdentityToken(); // 👈 Changed from getAccessToken
//   const { login } = useLogin();
//   const { login: saveUserLocally, isLogged, loading } = useGlobalContext();

//   useEffect(() => {
//     Animated.parallel([
//       Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
//       Animated.spring(scaleAnim, { toValue: 1, friction: 8, tension: 40, useNativeDriver: true }),
//     ]).start();
//   }, [fadeAnim, scaleAnim]);

//   useEffect(() => {
//     if (user) handleSuccessfulAuth();
//   }, [user]);

//   const handleSuccessfulAuth = async () => {
//     try {
//       console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
//       console.log('🚀 STARTING AUTH FLOW');
//       console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

//       // 1) Get the Privy identity token (contains user data)
//       console.log('📝 Step 1: Getting Privy identity token...');
//       const token = await getIdentityToken();

//       console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
//       console.log('🔑 IDENTITY TOKEN FOR TESTING:');
//       console.log(token);
//       console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
//       console.log('📋 Copy this token for curl tests');
//       console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
//       if (!token) {
//         throw new Error("No identity token available from Privy");
//       }
      
//       console.log('✅ Identity token received');
//       console.log('   Token length:', token.length);
//       console.log('   Preview:', token.substring(0, 30) + '...');

//       // 2) Set token for API calls
//       console.log('📝 Step 2: Setting auth token for API...');
//       setAuthToken(token);
//       console.log('✅ Auth token set');

//       // 3) Verify backend can read the token
//       console.log('📝 Step 3: Verifying backend authentication...');
//       try {
//         const me = await api.get('/api/auth/me', {
//           timeout: 15000,
//         });
//         console.log('✅ Backend verification successful');
//         console.log('   User ID:', me.data?.user?.id);
//       } catch (e: any) {
//         console.error('❌ Backend verification failed:', e?.response?.data || e.message);
//         throw new Error(`Backend verification failed: ${e?.response?.data?.error || e.message}`);
//       }

//       // 4) Get or create wallet (simplified for 1 wallet per user)
//       console.log('📝 Step 4: Setting up wallet...');
//       let walletId: string;
//       let starknetAddress: string;
//       let isDeployed: boolean = false;

//       try {
//         // Check if user already has a wallet
//         const listResponse = await api.get('/api/wallet/list');
//         const wallets = listResponse.data?.data?.wallets || [];
        
//         if (wallets.length > 0) {
//           // Use existing first wallet
//           console.log('✅ Found existing wallet');
//           walletId = wallets[0].id;
//           starknetAddress = wallets[0].address;
          
//           // Get deployment status
//           const detailsResponse = await api.get(`/api/wallet/${walletId}`);
//           isDeployed = detailsResponse.data?.data?.isDeployed || detailsResponse.data?.isDeployed || false;
//         } else {
//           // Create new wallet
//           console.log('📝 Creating new wallet...');
//           const createResponse = await api.post('/api/wallet/create');
//           walletId = createResponse.data?.data?.walletId || createResponse.data?.walletId;
//           starknetAddress = createResponse.data?.data?.address || createResponse.data?.address;
//           console.log('✅ Wallet created');
//         }
        
//         console.log(`   Wallet ID: ${walletId}`);
//         console.log(`   Address: ${starknetAddress}`);
//         console.log(`   Deployed: ${isDeployed}`);
        
//       } catch (error: any) {
//         console.error('❌ Wallet setup failed:', error.response?.data || error.message);
//         throw new Error(`Wallet setup failed: ${error.message}`);
//       }

//       // 5) Build and store local user
//       console.log('📝 Step 5: Building user data...');
//       const userEmail = getUserEmail(user) || user?.id || "";
//       const userData = {
//         id: user!.id,
//         email: userEmail,
//         privyUserId: user!.id,
//         walletId, 
//         starknetAddress,
//         rewardPoints: 2000,
//         earnsClaimed: 0,
//         walletDeployed: false,
//         createdAt: new Date().toISOString(),
//         accessToken: token, // This is now the identity token
//       };

//       console.log('📝 Step 6: Saving user locally...');
//       await saveUserLocally(userData);
//       console.log('✅ User saved locally');

//       console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
//       console.log('✅ AUTH FLOW COMPLETED SUCCESSFULLY!');
//       console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

//       router.replace("/(root)/(tabs)");
      
//     } catch (e: any) {
//       console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
//       console.error('❌ AUTH FLOW ERROR');
//       console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
//       console.error('Error message:', e?.message || e);
//       console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
//       Alert.alert(
//         "Authentication Error",
//         e?.message ?? "Failed to complete authentication. Please try again."
//       );
//     }
//   };

//   // Redirect if already logged in
//   if (loading) return null;
//   if (isLogged || user) {
//     return <Redirect href="/(root)/(tabs)" />;
//   }

//   const handleEmailLogin = async () => {
//     try {
//       setError("");
//       const session = await login({ loginMethods: ["email"] });
//       console.log("User logged in", session.user);
//     } catch (err: any) {
//       console.error("Login error:", err);
//       setError(err?.message || "Authentication failed");
//       if (err?.message && !err.message.includes("cancel")) {
//         Alert.alert("Error", err.message);
//       }
//     }
//   };

import React, { useState, useEffect, useRef } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  Animated,
} from "react-native";
import { Redirect, useRouter } from "expo-router";
import { usePrivy, useIdentityToken } from "@privy-io/expo";
import { useLogin } from "@privy-io/expo/ui";
import { useGlobalContext } from "@/lib/global-provider";
import { api, setAuthToken } from "@/lib/api";

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
  const { getIdentityToken } = useIdentityToken();
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
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🚀 STARTING AUTH FLOW');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      // 1) Get the Privy identity token (contains user data)
      console.log('📝 Step 1: Getting Privy identity token...');
      const token = await getIdentityToken();

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🔑 IDENTITY TOKEN FOR TESTING:');
      console.log(token);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📋 Copy this token for curl tests');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      if (!token) {
        throw new Error("No identity token available from Privy");
      }
      
      console.log('✅ Identity token received');
      console.log('   Token length:', token.length);
      console.log('   Preview:', token.substring(0, 30) + '...');

      // Step 2: Set token for API calls
      console.log('📝 Step 2: Setting auth token for API...');
      setAuthToken(token);
      console.log('✅ Auth token set');

      // Step 3: Verify backend authentication
      console.log('📝 Step 3: Verifying backend authentication...');
      try {
        const me = await api.get('/api/auth/me', { timeout: 15000 });
        console.log('✅ Backend verification successful');
        console.log('   User ID:', me.data?.user?.id);
      } catch (e: any) {
        console.error('❌ Backend verification failed:', e?.response?.data || e.message);
        throw new Error(`Backend verification failed: ${e?.response?.data?.error || e.message}`);
      }

      // Step 4: Get or create wallet
      console.log('📝 Step 4: Setting up wallet...');
      let walletId: string;
      let starknetAddress: string;
      let publicKey: string;
      let isDeployed: boolean = false;

      try {
        // Check if user already has a wallet
        const listResponse = await api.get('/api/wallet/list');
        const wallets = listResponse.data?.data?.wallets || [];
        
        if (wallets.length > 0) {
          // Use existing first wallet
          console.log('✅ Found existing wallet');
          const wallet = wallets[0];
          walletId = wallet.id;
          starknetAddress = wallet.address;
          publicKey = wallet.publicKey;
          
          // Get deployment status and balance
          const detailsResponse = await api.get(`/api/wallet/${walletId}`);
          isDeployed = detailsResponse.data?.data?.isDeployed || false;
          
          console.log(`   Wallet ID: ${walletId}`);
          console.log(`   Address: ${starknetAddress}`);
          console.log(`   Public Key: ${publicKey}`);
          console.log(`   Deployed: ${isDeployed}`);
          
        } else {
          // Create new wallet
          console.log('📝 Creating new wallet...');
          const createResponse = await api.post('/api/wallet/create');
          const data = createResponse.data?.data || createResponse.data;
          
          walletId = data.walletId;
          starknetAddress = data.address;
          publicKey = data.publicKey;
          isDeployed = false;
          
          console.log('✅ Wallet created');
          console.log(`   Wallet ID: ${walletId}`);
          console.log(`   Address: ${starknetAddress}`);
          console.log(`   Public Key: ${publicKey}`);
        }
        
      } catch (error: any) {
        console.error('❌ Wallet setup failed:', error.response?.data || error.message);
        throw new Error(`Wallet setup failed: ${error.message}`);
      }

      // Step 5: Build and store local user
      console.log('📝 Step 5: Building user data...');
      const userEmail = getUserEmail(user) || user?.id || "";
      const userData = {
        id: user!.id,
        email: userEmail,
        privyUserId: user!.id,
        walletId, 
        starknetAddress,
        publicKey,
        walletDeployed: isDeployed,
        rewardPoints: 2000, // Default starting points
        earnsClaimed: 0,
        earnsBalance: '0',
        createdAt: new Date().toISOString(),
        accessToken: token,
      };

      console.log('📝 Step 6: Saving user locally...');
      await saveUserLocally(userData);
      console.log('✅ User saved locally');

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ AUTH FLOW COMPLETED SUCCESSFULLY!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📊 User Summary:');
      console.log(`   Email: ${userEmail}`);
      console.log(`   Wallet: ${starknetAddress}`);
      console.log(`   Deployed: ${isDeployed}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      router.replace("/(root)/(tabs)");
      
    } catch (e: any) {
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('❌ AUTH FLOW ERROR');
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('Error message:', e?.message || e);
      console.error('Full error:', e);
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      Alert.alert(
        "Authentication Error",
        e?.message ?? "Failed to complete authentication. Please try again."
      );
    }
  };

  // Redirect if already logged in
  if (loading) return null;
  if (isLogged || user) {
    return <Redirect href="/(root)/(tabs)" />;
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