import { Tabs } from 'expo-router';
import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';

// ─────────────────────────────────────────────────────────────────────────────
// Stable tab-button components — defined OUTSIDE any render function.
//
// React Navigation compares tabBarButton by reference on every render.
// An inline arrow function creates a new reference each time, causing the
// navigator to unmount + remount the tab and breaking the tab bar.
// Named components here are module-level constants: reference is always stable.
// ─────────────────────────────────────────────────────────────────────────────

// Hidden tab button (owner-only screens must not be visible to regular users)
function HiddenTabButton() {
  return null;
}

const SHARED_TAB_STYLE = {
  headerShown: false,
  tabBarStyle: {
    backgroundColor: '#ffffff',
    borderTopWidth: 0,
    height: 64,
    paddingTop: 8,
    paddingBottom: 8,
    elevation: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  tabBarItemStyle: { alignItems: 'center' as const, justifyContent: 'center' as const },
  tabBarActiveTintColor: '#2C3E50',
  tabBarInactiveTintColor: '#aaaaaa',
  tabBarShowLabel: true,
  tabBarLabelStyle: { fontSize: 11, fontWeight: '600' as const, marginTop: 2, letterSpacing: 0.2 },
};

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN tab navigator — same white bar; Favorites hidden, Home → Dashboard
// ─────────────────────────────────────────────────────────────────────────────
function AdminTabLayout() {
  return (
    <Tabs screenOptions={SHARED_TAB_STYLE}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="search" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          tabBarButton: HiddenTabButton,
          tabBarItemStyle: { display: 'none' },
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="heart" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="feedback"
        options={{
          title: 'Feedback',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubble-ellipses-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="users"
        options={{
          title: 'Users',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// USER tab navigator — white bar, standard style
// ─────────────────────────────────────────────────────────────────────────────
function UserTabLayout() {
  return (
    <Tabs screenOptions={SHARED_TAB_STYLE}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="search" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: 'Favorites',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="heart" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="feedback"
        options={{
          title: 'Feedback',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubble-ellipses-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="users"
        options={{
          tabBarButton: HiddenTabButton,
          tabBarItemStyle: { display: 'none' },
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// OWNER tab navigator — only Dashboard and Profile are visible.
// Browse / Favorites / Feedback / Users are hidden entirely so owners never
// see or accidentally land on any user-facing tab.
// ─────────────────────────────────────────────────────────────────────────────
function OwnerTabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 0,
          height: 64,
          paddingTop: 8,
          paddingBottom: 8,
          elevation: 12,
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
        },
        tabBarItemStyle: { alignItems: 'center', justifyContent: 'center' },
        tabBarActiveTintColor: '#2C3E50',
        tabBarInactiveTintColor: '#aaaaaa',
        tabBarShowLabel: true,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginTop: 2, letterSpacing: 0.2 },
      }}
    >
      {/* Dashboard — the index tab renders OwnerDashboard inline so the
          tab bar stays visible; no stack-screen push needed */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid-outline" size={size} color={color} />
          ),
        }}
      />
      {/* User-only tabs — hidden completely for owners */}
      <Tabs.Screen
        name="search"
        options={{
          tabBarButton: HiddenTabButton,
          tabBarItemStyle: { display: 'none' },
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="search" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          tabBarButton: HiddenTabButton,
          tabBarItemStyle: { display: 'none' },
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="heart" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="feedback"
        options={{
          tabBarButton: HiddenTabButton,
          tabBarItemStyle: { display: 'none' },
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubble-ellipses-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="users"
        options={{
          tabBarButton: HiddenTabButton,
          tabBarItemStyle: { display: 'none' },
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={size} color={color} />
          ),
        }}
      />
      {/* Profile — owners still need to log out and edit their profile */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Root export — role is stable within a session so conditional rendering
// here does not cause re-mounting during normal navigation
// ─────────────────────────────────────────────────────────────────────────────
export default function TabLayout() {
  const { user } = useAuth();
  if (user?.role === 'ADMIN') return <AdminTabLayout />;
  if (user?.role === 'HOUSE_OWNER') return <OwnerTabLayout />;
  return <UserTabLayout />;
}
