import { useEffect, useRef, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  SafeAreaView,
  FlatList,
  Modal,
} from "react-native";
import { CameraView, useCameraPermissions, CameraType } from "expo-camera";
import * as MediaLibrary from "expo-media-library";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

export default function App() {
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [hasMediaLibraryPermission, setHasMediaLibraryPermission] = useState(false);

  const [image, setImage] = useState<string | null>(null);
  const [facing, setFacing] = useState<CameraType>("back");
  const [flash, setFlash] = useState<"off" | "on">("off");
  const [lastPhoto, setLastPhoto] = useState<string | null>(null);
  const [gallery, setGallery] = useState<MediaLibrary.Asset[]>([]);
  const [galleryVisible, setGalleryVisible] = useState(false);

  const cameraRef = useRef<CameraView>(null);

  useEffect(() => {
    const requestPermission = async () => {
      // ต้องใส่ accessPrivileges: "all" สำหรับ iOS 17+
      const mediaLibraryStatus = await MediaLibrary.requestPermissionsAsync();

      setHasMediaLibraryPermission(mediaLibraryStatus.status === "granted");

      if (mediaLibraryStatus.status === "granted") {
        await loadGallery();
        if (gallery.length > 0) setLastPhoto(gallery[0].uri);
      }
    };
    requestPermission();
  }, []);

  const loadGallery = async () => {
    const assets = await MediaLibrary.getAssetsAsync({
      sortBy: [[MediaLibrary.SortBy.creationTime, false]],
      first: 50,
      mediaType: ["photo"],
    });
    setGallery(assets.assets);
    if (assets.assets.length > 0) setLastPhoto(assets.assets[0].uri);
  };

  const handleTakePicture = async () => {
    if (cameraRef.current) {
      try {
        const newPhoto = await cameraRef.current.takePictureAsync();
        setImage(newPhoto.uri);
      } catch (err) {
        console.error("❌ Take picture error:", err);
      }
    }
  };

  const handleSaveToGallery = async () => {
    if (image) {
      try {
        const asset = await MediaLibrary.createAssetAsync(image);
        setLastPhoto(asset.uri);
        setGallery((prev) => [asset, ...prev]);
        setImage(null);
        alert("✅ Saved to gallery!");
      } catch (err) {
        console.error("❌ Save error:", err);
      }
    }
  };

  if (!cameraPermission) {
    return (
      <View style={styles.center}>
        <Text>Requesting camera permission...</Text>
      </View>
    );
  }

  if (!cameraPermission.granted) {
    return (
      <View style={styles.center}>
        <Text>No access to camera</Text>
        <TouchableOpacity onPress={requestCameraPermission}>
          <Text style={{ color: "skyblue" }}>Grant permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!hasMediaLibraryPermission) {
    return (
      <View style={styles.center}>
        <Text>Requesting media library permission...</Text>
      </View>
    );
  }

  if (image) {
    return (
      <SafeAreaView style={styles.container}>
        <Image source={{ uri: image }} style={styles.preview} />
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.controlButton} onPress={() => setImage(null)}>
            <Ionicons name="camera-reverse" size={28} color="#fff" />
            <Text style={styles.text}>Retake</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.controlButton} onPress={handleSaveToGallery}>
            <Ionicons name="download" size={28} color="#fff" />
            <Text style={styles.text}>Save</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={facing}
        enableTorch={flash === "on"} // ✅ ใช้แทน flashMode
      >
        <View style={styles.bottomControls}>
          {/* Thumbnail ล่าสุด */}
          <TouchableOpacity style={styles.thumbnailWrapper} onPress={() => setGalleryVisible(true)}>
            {lastPhoto ? (
              <LinearGradient colors={["#ff9a9e", "#fad0c4"]} style={styles.thumbnailGradient}>
                <Image source={{ uri: lastPhoto }} style={styles.thumbnail} />
              </LinearGradient>
            ) : (
              <Ionicons name="image" size={30} color="#fff" />
            )}
          </TouchableOpacity>

          {/* ปุ่มถ่ายรูป */}
          <TouchableOpacity onPress={handleTakePicture}>
            <LinearGradient colors={["#4facfe", "#00f2fe"]} style={styles.captureButtonGradient} />
          </TouchableOpacity>

          {/* ปุ่มแฟลช + สลับกล้อง */}
          <View style={styles.sideButtons}>
            <TouchableOpacity onPress={() => setFlash(flash === "off" ? "on" : "off")}>
              <Ionicons
                name={flash === "off" ? "flash-off" : "flash"}
                size={28}
                color="#fff"
              />
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setFacing(facing === "back" ? "front" : "back")}>
              <Ionicons name="camera-reverse" size={28} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </CameraView>

      {/* Gallery Modal */}
      <Modal visible={galleryVisible} animationType="slide">
        <SafeAreaView style={styles.galleryContainer}>
          <View style={styles.galleryHeader}>
            <Text style={styles.galleryTitle}>Gallery</Text>
            <TouchableOpacity
              onPress={() => {
                setGalleryVisible(false);
                loadGallery();
              }}
            >
              <Ionicons name="close" size={32} color="#fff" />
            </TouchableOpacity>
          </View>
          <FlatList
            data={gallery}
            numColumns={3}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <Image source={{ uri: item.uri }} style={styles.galleryImage} />}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  camera: { flex: 1, justifyContent: "flex-end" },
  preview: { flex: 1, width: "100%" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  bottomControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  captureButtonGradient: {
    width: 80,
    height: 80,
    borderRadius: 50,
    borderWidth: 5,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 5 },
    shadowRadius: 10,
    elevation: 5,
  },
  sideButtons: { flexDirection: "column", justifyContent: "space-between", height: 80 },
  thumbnailWrapper: {
    width: 60,
    height: 60,
    borderRadius: 15,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 5,
    elevation: 4,
  },
  thumbnailGradient: {
    width: "100%",
    height: "100%",
    borderRadius: 15,
  },
  thumbnail: { width: "100%", height: "100%" },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#111",
    padding: 20,
  },
  controlButton: { alignItems: "center" },
  text: { color: "#fff", marginTop: 5 },

  // Gallery
  galleryContainer: { flex: 1, backgroundColor: "#000" },
  galleryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 15,
    alignItems: "center",
  },
  galleryTitle: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  galleryImage: {
    width: "33%",
    height: 120,
    borderWidth: 1,
    borderColor: "#111",
  },
});
