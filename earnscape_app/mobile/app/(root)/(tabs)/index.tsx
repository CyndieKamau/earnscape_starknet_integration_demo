import { Link, useRouter } from "expo-router";
import { Text, View,  TouchableOpacity } from "react-native";
import { useGlobalContext } from "@/lib/global-provider";
import { usePrivy } from "@privy-io/expo";

export default function Index() {
  const router = useRouter();
  const { clearLocalUser, refetch, bypassNextAutoLogin } = useGlobalContext();
  const { logout: privyLogout } = usePrivy();

  const handleLogout = async () => {
    // 1) end Privy session
    await privyLogout().catch(() => {});
    // 2) clear your own cache, and make sure next hydration ignores any stale user
    await clearLocalUser();
    bypassNextAutoLogin();
    await refetch();
    // 3) move across the auth boundary with replace()
    router.replace("/auth/sign-in");
    console.log("Logged out, user cleared");
  };
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Text className="font-bold my-10 font-rubik text-3xl">Welcome to Earnscape</Text>
      <Link href="/auth/sign-in"> Sign In</Link>
      <Link href="/(root)/(tabs)/profile"> Profile</Link>
      <Link href="/(root)/(tabs)/claim"> Claim Rewards</Link>
      <Link href="/(root)/(tabs)/withdraw"> Withdraw</Link>
      <TouchableOpacity
        onPress={handleLogout}
        className="bg-primary px-6 py-3 rounded-xl"
      >
        <Text className="text-dark font-rubik-semibold text-base">
          Sign Out
        </Text>
      </TouchableOpacity>
    </View>
  );
}
