/**
 * RootNavigator.jsx
 *
 * TREE OVERVIEW
 * ─────────────────────────────────────────────────────────────────
 *  RootNavigator
 *  ├── isLoading        → <SplashScreen />   (AsyncStorage reading)
 *  │
 *  ├── !isLoggedIn      → AuthStack (no tab bar)
 *  │     Login
 *  │     Register
 *  │     VerifyOtp
 *  │     OAuthSuccess
 *  │
 *  ├── isLoggedIn + USER → UserRootStack
 *  │     UserTabs (bottom tabs)
 *  │       Home      → HomeScreen
 *  │       Search   → SearchScreen
 *  │       Favorites→ FavoritesScreen
 *  │       About    → AboutScreen
 *  │       Profile  → ProfileScreen
 *  │     ── Shared screens pushed on top of tabs ──
 *  │       PropertyDetails
 *  │       SearchResult
 *  │       PostListing
 *  │       EditHouse
 *  │       Feedback
 *  │       ChatBot
 *  │       About
 *  │
 *  └── isLoggedIn + ADMIN → AdminRootStack
 *        AdminTabs (bottom tabs)
 *          AdminFeedbackTab → AdminFeedbackScreen
 *          AdminRatingsTab  → AdminRatingsScreen
 *        ── Shared screens pushed on top of tabs ──
 *          SearchListings
 *          PropertyDetails
 *          SearchResult
 *          PostListing
 *          EditHouse
 *          Feedback
 *          ChatBot
 *          About
 *          Profile
 */

import {
  ActivityIndicator,
  Image,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
  Text,
} from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator }   from '@react-navigation/bottom-tabs';
import { useNavigation }              from '@react-navigation/native';
import { Ionicons }                   from '@expo/vector-icons';

import { useAuth } from '../context/AuthContext';

// ─── Screen imports ───────────────────────────────────────────────────────────
import LoginScreen            from '../screens/LoginScreen';
import RegisterScreen         from '../screens/RegisterScreen';
import OtpVerificationScreen  from '../screens/OtpVerificationScreen';
import OAuthSuccessScreen     from '../screens/OAuthSuccessScreen';

import HomeScreen             from '../screens/HomeScreen';
import SearchScreen           from '../screens/SearchScreen';
import SearchResultScreen     from '../screens/SearchResultScreen';
import PropertyDetailsScreen  from '../screens/PropertyDetailsScreen';
import FavoritesScreen        from '../screens/FavoritesScreen';
import ScheduleScreen         from '../screens/ScheduleScreen';
import ProfileScreen          from '../screens/ProfileScreen';
import FeedbackScreen         from '../screens/FeedbackScreen';
import ChatBotScreen          from '../screens/ChatBotScreen';
import AboutScreen            from '../screens/AboutScreen';
import PostListingScreen      from '../screens/PostListingScreen';
import EditHouseScreen        from '../screens/EditHouseScreen';
import AdminFeedbackScreen    from '../screens/AdminFeedbackScreen';
import AdminRatingsScreen     from '../screens/AdminRatingsScreen';

// ─── Theme colors (navy+white — matches web frontend) ─────────────────────────
const COLORS = {
  navy:          '#1e3a5f',
  navyMid:       '#2d5a8c',
  white:         '#ffffff',
  pageBg:        '#f8f9fa',
  inactiveTab:   'rgba(255,255,255,0.55)',
  border:        '#e2e8f0',
};

// ─── Shared header style ──────────────────────────────────────────────────────
const HEADER_STYLE = {
  headerStyle:         { backgroundColor: COLORS.navy },
  headerTintColor:     COLORS.white,
  headerTitleStyle:    { fontWeight: '700', fontSize: 18, color: COLORS.white },
  headerShadowVisible: false,
  contentStyle:        { backgroundColor: COLORS.pageBg },
};

// ─── Tab bar style ────────────────────────────────────────────────────────────
const TAB_BAR_STYLE = {
  tabBarStyle: {
    backgroundColor: COLORS.navy,
    height:          Platform.OS === 'ios' ? 72 : 58,
    paddingBottom:   Platform.OS === 'ios' ? 16 : 6,
    paddingTop:      6,
    borderTopColor:  COLORS.navyMid,
    borderTopWidth:  1,
    elevation:       12,
    shadowColor:     'rgba(30,58,95,0.4)',
    shadowOffset:    { width: 0, height: -3 },
    shadowOpacity:   1,
    shadowRadius:    8,
  },
  tabBarActiveTintColor:   COLORS.white,
  tabBarInactiveTintColor: COLORS.inactiveTab,
  tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginTop: 2 },
};

// ─── Tab icon helpers ─────────────────────────────────────────────────────────
function tabIcon(name) {
  return ({ color, size, focused }) => (
    <Ionicons name={focused ? name : `${name}-outline`} size={size} color={color} />
  );
}

/** Profile tab icon — shows the user's avatar if available, initials otherwise */
function ProfileTabIcon({ size, focused, profileImage, username }) {
  const hasImage = profileImage && profileImage !== 'null' && profileImage !== '';

  if (hasImage) {
    const uri =
      profileImage.startsWith('http') ||
      profileImage.startsWith('data:') ||
      profileImage.startsWith('file')
        ? profileImage
        : `data:image/jpeg;base64,${profileImage}`;
    return (
      <Image
        source={{ uri }}
        style={{
          width: size + 2,
          height: size + 2,
          borderRadius: (size + 2) / 2,
          borderWidth: focused ? 2 : 0,
          borderColor: COLORS.white,
        }}
      />
    );
  }

  // Initials fallback
  const initials = (username || 'U').slice(0, 1).toUpperCase();
  return (
    <View style={{
      width: size + 2, height: size + 2,
      borderRadius: (size + 2) / 2,
      backgroundColor: focused ? COLORS.white : COLORS.navyMid,
      alignItems: 'center', justifyContent: 'center',
      borderWidth: focused ? 2 : 0,
      borderColor: COLORS.white,
    }}>
      <Text style={{ fontSize: 12, fontWeight: '700', color: focused ? COLORS.navy : COLORS.white }}>
        {initials}
      </Text>
    </View>
  );
}

// ─── Floating Chat Button ─────────────────────────────────────────────────────
function FloatingChatButton() {
  const navigation = useNavigation();
  return (
    <TouchableOpacity
      style={fab.btn}
      onPress={() => navigation.navigate('ChatBot')}
      activeOpacity={0.85}
    >
      <Ionicons name="chatbubble-ellipses" size={26} color="#fff" />
    </TouchableOpacity>
  );
}

// ─── Navigators ───────────────────────────────────────────────────────────────
const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

// ── Auth Stack ────────────────────────────────────────────────────────────────
function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ ...HEADER_STYLE, headerShown: false }}>
      <Stack.Screen name="Login"   component={LoginScreen} />
      <Stack.Screen name="Register"    component={RegisterScreen}
        options={{ headerShown: true, title: 'Create Account' }} />
      <Stack.Screen name="VerifyOtp"   component={OtpVerificationScreen}
        options={{ headerShown: true, title: 'Verify Email' }} />
      <Stack.Screen name="OAuthSuccess" component={OAuthSuccessScreen}
        options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

// ── User Tabs ─────────────────────────────────────────────────────────────────
function UserTabs() {
  const { profileImage, username } = useAuth();

  return (
    <Tab.Navigator screenOptions={{ headerShown: false, ...TAB_BAR_STYLE, tabBarShowLabel: false }}>
      <Tab.Screen name="Home"      component={HomeScreen}
        options={{ tabBarIcon: tabIcon('home') }} />
      <Tab.Screen name="Search"    component={SearchScreen}
        options={{ tabBarIcon: tabIcon('search') }} />
      <Tab.Screen name="Favorites" component={FavoritesScreen}
        options={{ tabBarIcon: tabIcon('heart') }} />
      <Tab.Screen name="About"     component={AboutScreen}
        options={{ tabBarIcon: tabIcon('information-circle'),
          ...HEADER_STYLE, headerShown: true, headerTitle: 'About Us',
        }} />
      <Tab.Screen name="Profile"   component={ProfileScreen}
        options={{
          tabBarIcon: ({ size, focused }) => (
            <ProfileTabIcon
              size={size} focused={focused}
              profileImage={profileImage} username={username}
            />
          ),
          ...HEADER_STYLE, headerShown: true, headerTitle: 'My Profile',
        }} />
    </Tab.Navigator>
  );
}

// ── Admin Tabs ────────────────────────────────────────────────────────────────
function AdminTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false, ...TAB_BAR_STYLE }}>
      <Tab.Screen
        name="AdminFeedbackTab"
        component={AdminFeedbackScreen}
        options={{
          title: 'Feedback',
          tabBarIcon: tabIcon('chatbubble-ellipses'),
          ...HEADER_STYLE,
          headerShown: true,
        }}
      />
      <Tab.Screen
        name="AdminRatingsTab"
        component={AdminRatingsScreen}
        options={{
          title: 'Ratings',
          tabBarIcon: tabIcon('star'),
          ...HEADER_STYLE,
          headerShown: true,
        }}
      />
    </Tab.Navigator>
  );
}

// ── User Root Stack (tabs + shared screens) ───────────────────────────────────
// Shared screens sit in this outer stack so they can be pushed from any tab.
function UserRootStack() {
  return (
    <View style={{ flex: 1 }}>
    <Stack.Navigator screenOptions={HEADER_STYLE}>
      {/* Tabs — no header (each tab manages its own) */}
      <Stack.Screen
        name="Main"
        component={UserTabs}
        options={{ headerShown: false }}
      />

      {/* Shared screens — pushed on top of any tab */}
      <Stack.Screen
        name="PropertyDetails"
        component={PropertyDetailsScreen}
        options={{ title: 'Property Details' }}
      />
      <Stack.Screen
        name="SearchResult"
        component={SearchResultScreen}
        options={{ title: 'Search Results' }}
      />
      <Stack.Screen
        name="PostListing"
        component={PostListingScreen}
        options={{ title: 'Post a Listing' }}
      />
      <Stack.Screen
        name="EditHouse"
        component={EditHouseScreen}
        options={{ title: 'Edit Property' }}
      />
      <Stack.Screen
        name="Feedback"
        component={FeedbackScreen}
        options={{ title: 'Feedback' }}
      />
      <Stack.Screen
        name="ChatBot"
        component={ChatBotScreen}
        options={{ title: 'Rental Assistant' }}
      />
      <Stack.Screen
        name="Schedule"
        component={ScheduleScreen}
        options={{ title: 'Schedule a Visit' }}
      />
    </Stack.Navigator>
    <FloatingChatButton />
    </View>
  );
}

// ── Admin Root Stack (tabs + shared screens) ──────────────────────────────────
function AdminRootStack() {
  return (
    <Stack.Navigator screenOptions={HEADER_STYLE}>
      <Stack.Screen
        name="Main"
        component={AdminTabs}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="SearchListings"
        component={SearchScreen}
        options={{ title: 'Manage Listings' }}
      />
      <Stack.Screen
        name="PropertyDetails"
        component={PropertyDetailsScreen}
        options={{ title: 'Property Details' }}
      />
      <Stack.Screen
        name="SearchResult"
        component={SearchResultScreen}
        options={{ title: 'Search Results' }}
      />
      <Stack.Screen
        name="PostListing"
        component={PostListingScreen}
        options={{ title: 'Post a Listing' }}
      />
      <Stack.Screen
        name="EditHouse"
        component={EditHouseScreen}
        options={{ title: 'Edit Property' }}
      />
      <Stack.Screen
        name="Feedback"
        component={FeedbackScreen}
        options={{ title: 'Feedback' }}
      />
      <Stack.Screen
        name="ChatBot"
        component={ChatBotScreen}
        options={{ title: 'Rental Assistant' }}
      />
      <Stack.Screen
        name="About"
        component={AboutScreen}
        options={{ title: 'About Us' }}
      />
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
    </Stack.Navigator>
  );
}

// ─── Splash Screen ────────────────────────────────────────────────────────────
function SplashScreen() {
  return (
    <View style={splash.container}>
      <ActivityIndicator size="large" color={COLORS.navy} />
    </View>
  );
}
const splash = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.pageBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

// ─── FAB styles ───────────────────────────────────────────────────────────────
const fab = StyleSheet.create({
  btn: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 100 : 76,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.navy,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgba(30,58,95,0.5)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 2,
    borderColor: COLORS.navyMid,
  },
});

// ─── Root Navigator ───────────────────────────────────────────────────────────
export default function RootNavigator() {
  const { isLoading, isLoggedIn, isAdmin } = useAuth();

  if (isLoading)   return <SplashScreen />;
  if (!isLoggedIn) return <AuthStack />;
  if (isAdmin)     return <AdminRootStack />;
  return <UserRootStack />;
}

// ─── Screen name constants ────────────────────────────────────────────────────
export const SCREENS = {
  // Auth
  LOGIN:            'Login',
  REGISTER:         'Register',
  VERIFY_OTP:       'VerifyOtp',
  OAUTH_SUCCESS:    'OAuthSuccess',

  // User tabs
  HOME:             'Home',
  SEARCH:           'Search',
  FAVORITES:        'Favorites',
  ABOUT_TAB:        'About',
  PROFILE:          'Profile',

  // Shared (user + admin)
  PROPERTY_DETAILS: 'PropertyDetails',
  SEARCH_RESULT:    'SearchResult',
  POST_LISTING:     'PostListing',
  EDIT_HOUSE:       'EditHouse',
  FEEDBACK:         'Feedback',
  CHATBOT:          'ChatBot',
  ABOUT:            'About',
  SCHEDULE:         'Schedule',

  // Admin tabs
  ADMIN_FEEDBACK:   'AdminFeedbackTab',
  ADMIN_RATINGS:    'AdminRatingsTab',

  // Admin shared
  SEARCH_LISTINGS:  'SearchListings',
  PROFILE_ADMIN:    'Profile',
};
