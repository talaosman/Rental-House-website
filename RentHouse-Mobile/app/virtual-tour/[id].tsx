import React, { useEffect, useState } from 'react';
import { StyleSheet, View, ActivityIndicator, Text, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { WebView } from 'react-native-webview';

const BASE = 'http://100.126.231.12:5000';

export default function VirtualTourScreen() {
  const router = useRouter();
  const { id, tourUrl: paramUrl } = useLocalSearchParams<{ id?: string; tourUrl?: string }>();

  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(
    typeof paramUrl === 'string' ? paramUrl : null,
  );

  useEffect(() => {
    if (paramUrl) {
      setResolvedUrl(typeof paramUrl === 'string' ? paramUrl : (paramUrl as string[])[0]);
      setLoading(false);
      return;
    }
    if (!id) {
      setError('No house ID provided.');
      setLoading(false);
      return;
    }
    fetch(`${BASE}/api/houses/${id}/virtual-tour-url`)
      .then((r) => {
        if (!r.ok) throw new Error(`Server returned ${r.status}`);
        return r.json();
      })
      .then((d) => {
        if (!d?.virtualTourUrl) throw new Error('No virtual tour URL found for this property.');
        setResolvedUrl(d.virtualTourUrl);
      })
      .catch((e) => setError(e.message || 'Failed to load virtual tour.'))
      .finally(() => setLoading(false));
  }, [id, paramUrl]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (error || !resolvedUrl) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>⚠ {error ?? 'Could not load the virtual tour.'}</Text>
      </View>
    );
  }

  console.log('TOUR URL RESOLVED:', resolvedUrl);

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <script src="https://aframe.io/releases/1.4.0/aframe.min.js"></script>
  <style>
    html, body { margin: 0; padding: 0; width: 100vw; height: 100vh; overflow: hidden; background: #000; }
  </style>
</head>
<body>
  <script>
    async function loadTour() {
      try {
        const res = await fetch('${resolvedUrl}');
        const blob = await res.blob();
        const reader = new FileReader();
        reader.onloadend = function() {
          const base64 = reader.result;
          const scene = document.createElement('a-scene');
          scene.setAttribute('embedded', '');
          scene.setAttribute('vr-mode-ui', 'enabled: false');
          scene.style.width = '100vw';
          scene.style.height = '100vh';
          const sky = document.createElement('a-sky');
          sky.setAttribute('src', base64);
          scene.appendChild(sky);
          document.body.appendChild(scene);
        };
        reader.readAsDataURL(blob);
      } catch(e) {
        document.body.innerHTML = '<p style="color:white;text-align:center;margin-top:40vh">Failed to load tour: ' + e.message + '</p>';
      }
    }
    loadTour();
  </script>
</body>
</html>
`;

  return (
    <View style={{ flex: 1 }}>
      <WebView
        source={{ html }}
        style={{ flex: 1 }}
        javaScriptEnabled
        allowsInlineMediaPlayback
        originWhitelist={['*']}
        onError={(e) => console.log('WEBVIEW ERROR:', e.nativeEvent)}
        onHttpError={(e) => console.log('WEBVIEW HTTP ERROR:', e.nativeEvent)}
        onLoadEnd={() => console.log('WEBVIEW LOADED')}
      />
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  backButton: {
    position: 'absolute',
    top: 48,
    left: 16,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
