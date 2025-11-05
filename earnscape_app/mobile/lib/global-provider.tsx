import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "@earnscape_user";

// User type definition
export interface User {
  id: string;
  email: string;
  starknetAddress?: string;
  rewardPoints: number;
  earnsClaimed: number;
  walletDeployed: boolean;
}

// Context type definition
interface GlobalContextType {
  // session state
  isLogged: boolean;
  user: User | null;
  loading: boolean;   // still hydrating from storage
  hydrated: boolean;  // !loading alias for convenience

  // core actions
  refetch: () => Promise<void>;
  login: (userData: User) => Promise<void>;            // persistent
  loginEphemeral: (userData: User) => Promise<void>;   // DEV: non-persistent
  logout: () => Promise<void>;
  clearLocalUser: () => Promise<void>;

  // testing utilities
  testMode: boolean;                     // when true, always behave "logged out"
  setTestMode: (v: boolean) => void;
  bypassNextAutoLogin: () => void;       // ignore saved user on next refetch once
}

const GlobalContext = createContext<GlobalContextType | undefined>(undefined);

export const GlobalProvider = ({ children }: { children: ReactNode }) => {
  const [isLogged, setIsLogged] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [testMode, setTestMode] = useState(
    String(process.env.EXPO_PUBLIC_AUTH_TEST_MODE || "") === "1"
  );

  // If true, the next hydration will ignore saved storage once
  const bypassNextAutoLoginRef = useRef(false);

  useEffect(() => {
    checkAuthStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkAuthStatus = async () => {
    try {
      setLoading(true);

      const savedUserStr = await AsyncStorage.getItem(STORAGE_KEY);

      // If test mode or bypass flag is set, pretend there is no saved user
      if (testMode || bypassNextAutoLoginRef.current) {
        bypassNextAutoLoginRef.current = false; // consume the one-shot flag
        setUser(null);
        setIsLogged(false);
        return;
      }

      if (savedUserStr) {
        try {
          const userData = JSON.parse(savedUserStr) as User;
          setUser(userData);
          setIsLogged(true);
        } catch (err) {
          console.warn("Invalid user JSON in storage, clearing:", err);
          await AsyncStorage.removeItem(STORAGE_KEY);
          setUser(null);
          setIsLogged(false);
        }
      } else {
        setUser(null);
        setIsLogged(false);
      }
    } catch (error) {
      console.error("Error checking auth status:", error);
      setUser(null);
      setIsLogged(false);
    } finally {
      setLoading(false);
    }
  };

  // Persistent login (used in production)
  const login = async (userData: User) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
      setUser(userData);
      setIsLogged(true);
    } catch (error) {
      console.error("Error during login:", error);
      throw error;
    }
  };

  // DEV: do not persist to storage; survives until app restarts
  const loginEphemeral = async (userData: User) => {
    setUser(userData);
    setIsLogged(true);
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      setUser(null);
      setIsLogged(false);
    } catch (error) {
      console.error("Error during logout:", error);
      throw error;
    }
  };

  const clearLocalUser = async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      // swallow
    }
  };

  const refetch = async () => {
    await checkAuthStatus();
  };

  const bypassNextAutoLogin = () => {
    bypassNextAutoLoginRef.current = true;
  };

  return (
    <GlobalContext.Provider
      value={{
        isLogged,
        user,
        loading,
        hydrated: !loading,
        refetch,
        login,
        loginEphemeral,
        logout,
        clearLocalUser,
        testMode,
        setTestMode,
        bypassNextAutoLogin,
      }}
    >
      {children}
    </GlobalContext.Provider>
  );
};

// Custom hook to use the global context
export const useGlobalContext = () => {
  const context = useContext(GlobalContext);
  if (context === undefined) {
    throw new Error("useGlobalContext must be used within a GlobalProvider");
  }
  return context;
};

export default GlobalContext;