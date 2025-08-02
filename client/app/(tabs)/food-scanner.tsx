import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  TextInput,
  Modal,
  Dimensions,
  Animated,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/src/i18n/context/LanguageContext";
import { useTheme } from "@/src/context/ThemeContext";
import {
  Camera,
  Scan,
  Image as ImageIcon,
  Plus,
  Clock,
  Target,
  Zap,
  AlertTriangle,
  CheckCircle,
  X,
  BarChart3,
  Package,
  Utensils,
  Info,
} from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import { foodScannerAPI } from "@/src/services/api";
import LoadingScreen from "@/components/LoadingScreen";

const { width } = Dimensions.get("window");

interface ProductData {
  barcode?: string;
  name: string;
  brand?: string;
  category: string;
  nutrition_per_100g: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber?: number;
    sugar?: number;
    sodium?: number;
  };
  ingredients: string[];
  allergens: string[];
  labels: string[];
  health_score?: number;
  image_url?: string;
}

interface UserAnalysis {
  compatibility_score: number;
  daily_contribution: {
    calories_percent: number;
    protein_percent: number;
    carbs_percent: number;
    fat_percent: number;
  };
  alerts: string[];
  recommendations: string[];
  health_assessment: string;
}

export default function FoodScannerScreen() {
  const { t } = useTranslation();
  const { isRTL, language } = useLanguage();
  const { colors, isDark } = useTheme();

  const [scanMode, setScanMode] = useState<"barcode" | "image">("barcode");
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<{
    product: ProductData;
    user_analysis: UserAnalysis;
  } | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [quantity, setQuantity] = useState("100");
  const [mealTiming, setMealTiming] = useState("SNACK");
  const [scanHistory, setScanHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Animation values
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.9));

  useEffect(() => {
    loadScanHistory();
    
    // Start animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
    ]).start();
  }, []);

  const loadScanHistory = async () => {
    try {
      const response = await foodScannerAPI.getScannedHistory();
      if (response.success) {
        setScanHistory(response.data || []);
      }
    } catch (error) {
      console.error("Error loading scan history:", error);
    }
  };

  const handleImageScan = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          language === "he" ? "הרשאה נדרשת" : "Permission Required",
          language === "he" 
            ? "נדרשת הרשאה לגישה לגלריה"
            : "Gallery permission is required"
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        setIsScanning(true);
        
        try {
          const response = await foodScannerAPI.scanProductImage(
            result.assets[0].base64!
          );
          
          if (response.success) {
            setScanResult(response.data);
          } else {
            throw new Error(response.error || "Scan failed");
          }
        } catch (error: any) {
          Alert.alert(
            language === "he" ? "שגיאה" : "Error",
            error.message || (language === "he" 
              ? "נכשל בסריקת התמונה"
              : "Failed to scan image")
          );
        } finally {
          setIsScanning(false);
        }
      }
    } catch (error) {
      console.error("Image scan error:", error);
      setIsScanning(false);
    }
  };

  const handleBarcodeInput = async () => {
    Alert.prompt(
      language === "he" ? "הכנס ברקוד" : "Enter Barcode",
      language === "he" 
        ? "הכנס את מספר הברקוד של המוצר"
        : "Enter the product barcode number",
      async (barcode) => {
        if (barcode && barcode.trim()) {
          setIsScanning(true);
          
          try {
            const response = await foodScannerAPI.scanBarcode(barcode.trim());
            
            if (response.success) {
              setScanResult(response.data);
            } else {
              throw new Error(response.error || "Product not found");
            }
          } catch (error: any) {
            Alert.alert(
              language === "he" ? "שגיאה" : "Error",
              error.message || (language === "he" 
                ? "מוצר לא נמצא"
                : "Product not found")
            );
          } finally {
            setIsScanning(false);
          }
        }
      },
      "plain-text",
      "",
      "numeric"
    );
  };

  const handleAddToMealLog = async () => {
    if (!scanResult || !quantity) {
      Alert.alert(
        language === "he" ? "שגיאה" : "Error",
        language === "he" ? "אנא הכנס כמות" : "Please enter quantity"
      );
      return;
    }

    try {
      const response = await foodScannerAPI.addToMealLog(
        scanResult.product,
        parseFloat(quantity),
        mealTiming
      );

      if (response.success) {
        setShowAddModal(false);
        setScanResult(null);
        setQuantity("100");
        
        Alert.alert(
          language === "he" ? "הצלחה!" : "Success!",
          language === "he" 
            ? "המוצר נוסף ליומן הארוחות"
            : "Product added to meal log"
        );
        
        await loadScanHistory();
      } else {
        throw new Error(response.error || "Failed to add to meal log");
      }
    } catch (error: any) {
      Alert.alert(
        language === "he" ? "שגיאה" : "Error",
        error.message || (language === "he" 
          ? "נכשל בהוספה ליומן"
          : "Failed to add to meal log")
      );
    }
  };

  const getCompatibilityColor = (score: number) => {
    if (score >= 80) return "#10b981";
    if (score >= 60) return "#f59e0b";
    return "#ef4444";
  };

  const renderScanResult = () => {
    if (!scanResult) return null;

    const { product, user_analysis } = scanResult;
    const compatibilityColor = getCompatibilityColor(user_analysis.compatibility_score);

    return (
      <Animated.View
        style={[
          styles.resultContainer,
          { 
            backgroundColor: colors.card,
            borderColor: colors.border,
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <LinearGradient
          colors={isDark ? ["#047857", "#059669"] : ["#ecfdf5", "#d1fae5"]}
          style={styles.resultHeader}
        >
          <View style={styles.resultHeaderContent}>
            <Package size={24} color={colors.emerald500} />
            <Text style={[styles.resultTitle, { color: colors.emerald700 }]}>
              {language === "he" ? "תוצאות סריקה" : "Scan Results"}
            </Text>
          </View>
          
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setScanResult(null)}
          >
            <X size={20} color={colors.icon} />
          </TouchableOpacity>
        </LinearGradient>

        <ScrollView style={styles.resultContent} showsVerticalScrollIndicator={false}>
          {/* Product Info */}
          <View style={styles.productSection}>
            <Text style={[styles.productName, { color: colors.text }]}>
              {product.name}
            </Text>
            {product.brand && (
              <Text style={[styles.productBrand, { color: colors.icon }]}>
                {product.brand}
              </Text>
            )}
            <Text style={[styles.productCategory, { color: colors.emerald500 }]}>
              {product.category}
            </Text>
          </View>

          {/* Compatibility Score */}
          <View style={[styles.compatibilitySection, { backgroundColor: colors.surface }]}>
            <View style={styles.compatibilityHeader}>
              <Target size={20} color={compatibilityColor} />
              <Text style={[styles.compatibilityTitle, { color: colors.text }]}>
                {language === "he" ? "התאמה אישית" : "Personal Compatibility"}
              </Text>
            </View>
            
            <View style={styles.scoreContainer}>
              <Text style={[styles.scoreValue, { color: compatibilityColor }]}>
                {user_analysis.compatibility_score}%
              </Text>
              <Text style={[styles.scoreLabel, { color: colors.icon }]}>
                {language === "he" ? "ציון התאמה" : "Compatibility Score"}
              </Text>
            </View>
            
            <Text style={[styles.healthAssessment, { color: colors.text }]}>
              {user_analysis.health_assessment}
            </Text>
          </View>

          {/* Nutrition Info */}
          <View style={styles.nutritionSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {language === "he" ? "מידע תזונתי (לכל 100 גרם)" : "Nutrition Info (per 100g)"}
            </Text>
            
            <View style={styles.nutritionGrid}>
              <View style={[styles.nutritionItem, { backgroundColor: colors.surface }]}>
                <Zap size={16} color="#ef4444" />
                <Text style={[styles.nutritionValue, { color: colors.text }]}>
                  {product.nutrition_per_100g.calories}
                </Text>
                <Text style={[styles.nutritionLabel, { color: colors.icon }]}>
                  {language === "he" ? "קלוריות" : "Calories"}
                </Text>
              </View>
              
              <View style={[styles.nutritionItem, { backgroundColor: colors.surface }]}>
                <Target size={16} color="#3b82f6" />
                <Text style={[styles.nutritionValue, { color: colors.text }]}>
                  {product.nutrition_per_100g.protein}g
                </Text>
                <Text style={[styles.nutritionLabel, { color: colors.icon }]}>
                  {language === "he" ? "חלבון" : "Protein"}
                </Text>
              </View>
              
              <View style={[styles.nutritionItem, { backgroundColor: colors.surface }]}>
                <BarChart3 size={16} color="#10b981" />
                <Text style={[styles.nutritionValue, { color: colors.text }]}>
                  {product.nutrition_per_100g.carbs}g
                </Text>
                <Text style={[styles.nutritionLabel, { color: colors.icon }]}>
                  {language === "he" ? "פחמימות" : "Carbs"}
                </Text>
              </View>
              
              <View style={[styles.nutritionItem, { backgroundColor: colors.surface }]}>
                <Target size={16} color="#f59e0b" />
                <Text style={[styles.nutritionValue, { color: colors.text }]}>
                  {product.nutrition_per_100g.fat}g
                </Text>
                <Text style={[styles.nutritionLabel, { color: colors.icon }]}>
                  {language === "he" ? "שומן" : "Fat"}
                </Text>
              </View>
            </View>
          </View>

          {/* Alerts and Recommendations */}
          {user_analysis.alerts.length > 0 && (
            <View style={styles.alertsSection}>
              <View style={styles.alertsHeader}>
                <AlertTriangle size={20} color="#ef4444" />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  {language === "he" ? "התראות" : "Alerts"}
                </Text>
              </View>
              
              {user_analysis.alerts.map((alert, index) => (
                <View key={index} style={[styles.alertItem, { backgroundColor: "#fef2f2", borderColor: "#fecaca" }]}>
                  <Text style={[styles.alertText, { color: "#dc2626" }]}>
                    {alert}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {user_analysis.recommendations.length > 0 && (
            <View style={styles.recommendationsSection}>
              <View style={styles.recommendationsHeader}>
                <CheckCircle size={20} color="#10b981" />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  {language === "he" ? "המלצות" : "Recommendations"}
                </Text>
              </View>
              
              {user_analysis.recommendations.map((recommendation, index) => (
                <View key={index} style={[styles.recommendationItem, { backgroundColor: "#f0fdf4", borderColor: "#bbf7d0" }]}>
                  <Text style={[styles.recommendationText, { color: "#047857" }]}>
                    {recommendation}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Ingredients */}
          {product.ingredients.length > 0 && (
            <View style={styles.ingredientsSection}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {language === "he" ? "רכיבים" : "Ingredients"}
              </Text>
              
              <View style={styles.ingredientsList}>
                {product.ingredients.map((ingredient, index) => (
                  <View key={index} style={[styles.ingredientChip, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Text style={[styles.ingredientText, { color: colors.text }]}>
                      {ingredient}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </ScrollView>

        {/* Add to Meal Button */}
        <View style={[styles.resultActions, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.addToMealButton, { backgroundColor: colors.emerald500 }]}
            onPress={() => setShowAddModal(true)}
          >
            <Plus size={20} color="#ffffff" />
            <Text style={styles.addToMealButtonText}>
              {language === "he" ? "הוסף ליומן" : "Add to Meal Log"}
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

  const renderAddModal = () => (
    <Modal
      visible={showAddModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowAddModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {language === "he" ? "הוסף ליומן ארוחות" : "Add to Meal Log"}
            </Text>
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <X size={24} color={colors.icon} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>
                {language === "he" ? "כמות (גרם)" : "Quantity (grams)"}
              </Text>
              <TextInput
                style={[styles.quantityInput, { 
                  backgroundColor: colors.card, 
                  borderColor: colors.border,
                  color: colors.text 
                }]}
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="numeric"
                placeholder="100"
                placeholderTextColor={colors.icon}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>
                {language === "he" ? "סוג ארוחה" : "Meal Type"}
              </Text>
              
              <View style={styles.mealTypeSelector}>
                {[
                  { key: "BREAKFAST", label: language === "he" ? "ארוחת בוקר" : "Breakfast" },
                  { key: "LUNCH", label: language === "he" ? "ארוחת צהריים" : "Lunch" },
                  { key: "DINNER", label: language === "he" ? "ארוחת ערב" : "Dinner" },
                  { key: "SNACK", label: language === "he" ? "חטיף" : "Snack" },
                ].map(type => (
                  <TouchableOpacity
                    key={type.key}
                    style={[
                      styles.mealTypeOption,
                      { borderColor: colors.border },
                      mealTiming === type.key && { backgroundColor: colors.emerald500 }
                    ]}
                    onPress={() => setMealTiming(type.key)}
                  >
                    <Text style={[
                      styles.mealTypeText,
                      { color: mealTiming === type.key ? "#ffffff" : colors.text }
                    ]}>
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          <View style={[styles.modalActions, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.modalCancelButton, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => setShowAddModal(false)}
            >
              <Text style={[styles.modalCancelText, { color: colors.text }]}>
                {language === "he" ? "ביטול" : "Cancel"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalAddButton, { backgroundColor: colors.emerald500 }]}
              onPress={handleAddToMealLog}
            >
              <Plus size={16} color="#ffffff" />
              <Text style={styles.modalAddText}>
                {language === "he" ? "הוסף" : "Add"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  if (isScanning) {
    return (
      <LoadingScreen 
        text={language === "he" ? "סורק מוצר..." : "Scanning product..."} 
      />
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }, isRTL && styles.rtlText]}>
          {language === "he" ? "סורק מזון" : "Food Scanner"}
        </Text>
        <Text style={[styles.subtitle, { color: colors.icon }, isRTL && styles.rtlText]}>
          {language === "he" 
            ? "סרוק ברקודים או תמונות למידע תזונתי מיידי"
            : "Scan barcodes or images for instant nutrition info"
          }
        </Text>
      </View>

      {scanResult ? (
        renderScanResult()
      ) : (
        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {/* Scan Options */}
          <View style={styles.scanOptions}>
            <TouchableOpacity
              style={[
                styles.scanOption,
                { backgroundColor: colors.card, borderColor: colors.border },
                scanMode === "barcode" && { borderColor: colors.emerald500, backgroundColor: colors.emerald50 }
              ]}
              onPress={() => setScanMode("barcode")}
            >
              <LinearGradient
                colors={scanMode === "barcode" 
                  ? [colors.emerald500, colors.emerald600] 
                  : [colors.card, colors.card]
                }
                style={styles.scanOptionGradient}
              >
                <Scan size={32} color={scanMode === "barcode" ? "#ffffff" : colors.emerald500} />
                <Text style={[
                  styles.scanOptionTitle,
                  { color: scanMode === "barcode" ? "#ffffff" : colors.text }
                ]}>
                  {language === "he" ? "סריקת ברקוד" : "Barcode Scan"}
                </Text>
                <Text style={[
                  styles.scanOptionDescription,
                  { color: scanMode === "barcode" ? "rgba(255,255,255,0.8)" : colors.icon }
                ]}>
                  {language === "he" 
                    ? "סרוק ברקוד של מוצר ארוז"
                    : "Scan packaged product barcode"
                  }
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.scanOption,
                { backgroundColor: colors.card, borderColor: colors.border },
                scanMode === "image" && { borderColor: colors.emerald500, backgroundColor: colors.emerald50 }
              ]}
              onPress={() => setScanMode("image")}
            >
              <LinearGradient
                colors={scanMode === "image" 
                  ? [colors.emerald500, colors.emerald600] 
                  : [colors.card, colors.card]
                }
                style={styles.scanOptionGradient}
              >
                <ImageIcon size={32} color={scanMode === "image" ? "#ffffff" : colors.emerald500} />
                <Text style={[
                  styles.scanOptionTitle,
                  { color: scanMode === "image" ? "#ffffff" : colors.text }
                ]}>
                  {language === "he" ? "סריקת תמונה" : "Image Scan"}
                </Text>
                <Text style={[
                  styles.scanOptionDescription,
                  { color: scanMode === "image" ? "rgba(255,255,255,0.8)" : colors.icon }
                ]}>
                  {language === "he" 
                    ? "צלם תווית תזונתית של מוצר"
                    : "Photo nutrition label"
                  }
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Action Button */}
          <TouchableOpacity
            style={[styles.scanButton, { backgroundColor: colors.emerald500 }]}
            onPress={scanMode === "barcode" ? handleBarcodeInput : handleImageScan}
          >
            <LinearGradient
              colors={[colors.emerald500, colors.emerald600]}
              style={styles.scanButtonGradient}
            >
              {scanMode === "barcode" ? (
                <Scan size={24} color="#ffffff" />
              ) : (
                <Camera size={24} color="#ffffff" />
              )}
              <Text style={styles.scanButtonText}>
                {scanMode === "barcode" 
                  ? (language === "he" ? "הכנס ברקוד" : "Enter Barcode")
                  : (language === "he" ? "בחר תמונה" : "Select Image")
                }
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Tips */}
          <View style={[styles.tipsSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.tipsHeader}>
              <Info size={20} color={colors.emerald500} />
              <Text style={[styles.tipsTitle, { color: colors.text }]}>
                {language === "he" ? "טיפים לסריקה מוצלחת" : "Tips for Best Results"}
              </Text>
            </View>
            
            <View style={styles.tipsList}>
              <Text style={[styles.tipItem, { color: colors.icon }]}>
                • {language === "he" 
                  ? "וודא שהברקוד או התווית ברורים ומוארים היטב"
                  : "Ensure barcode or label is clear and well-lit"
                }
              </Text>
              <Text style={[styles.tipItem, { color: colors.icon }]}>
                • {language === "he" 
                  ? "עבור תמונות - צלם את התווית התזונתית במלואה"
                  : "For images - capture the complete nutrition label"
                }
              </Text>
              <Text style={[styles.tipItem, { color: colors.icon }]}>
                • {language === "he" 
                  ? "הימנע מהשתקפויות וצללים על התווית"
                  : "Avoid reflections and shadows on the label"
                }
              </Text>
            </View>
          </View>

          {/* Scan History */}
          {scanHistory.length > 0 && (
            <View style={styles.historySection}>
              <TouchableOpacity
                style={styles.historyHeader}
                onPress={() => setShowHistory(!showHistory)}
              >
                <Clock size={20} color={colors.emerald500} />
                <Text style={[styles.historyTitle, { color: colors.text }]}>
                  {language === "he" ? "היסטוריית סריקות" : "Scan History"}
                </Text>
                <Text style={[styles.historyCount, { color: colors.icon }]}>
                  ({scanHistory.length})
                </Text>
              </TouchableOpacity>
              
              {showHistory && (
                <View style={styles.historyList}>
                  {scanHistory.slice(0, 5).map((item, index) => (
                    <View key={index} style={[styles.historyItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <Package size={16} color={colors.emerald500} />
                      <View style={styles.historyItemContent}>
                        <Text style={[styles.historyItemName, { color: colors.text }]}>
                          {item.product_name || item.name}
                        </Text>
                        <Text style={[styles.historyItemDate, { color: colors.icon }]}>
                          {new Date(item.created_at).toLocaleDateString()}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
        </ScrollView>
      )}

      {renderAddModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 22,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  scanOptions: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 24,
  },
  scanOption: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 2,
    overflow: "hidden",
  },
  scanOptionGradient: {
    padding: 20,
    alignItems: "center",
    minHeight: 120,
    justifyContent: "center",
  },
  scanOptionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 12,
    marginBottom: 4,
  },
  scanOptionDescription: {
    fontSize: 12,
    textAlign: "center",
    lineHeight: 16,
  },
  scanButton: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  scanButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    gap: 12,
  },
  scanButtonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#ffffff",
  },
  tipsSection: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
  },
  tipsHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  tipsList: {
    gap: 8,
  },
  tipItem: {
    fontSize: 14,
    lineHeight: 20,
  },
  historySection: {
    marginBottom: 20,
  },
  historyHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
  },
  historyCount: {
    fontSize: 14,
  },
  historyList: {
    gap: 8,
  },
  historyItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  historyItemContent: {
    flex: 1,
  },
  historyItemName: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 2,
  },
  historyItemDate: {
    fontSize: 12,
  },
  resultContainer: {
    flex: 1,
    margin: 20,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
  },
  resultHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
  },
  resultHeaderContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  closeButton: {
    padding: 4,
  },
  resultContent: {
    flex: 1,
    padding: 20,
  },
  productSection: {
    marginBottom: 20,
    alignItems: "center",
  },
  productName: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 4,
  },
  productBrand: {
    fontSize: 14,
    marginBottom: 4,
  },
  productCategory: {
    fontSize: 12,
    fontWeight: "500",
    textTransform: "uppercase",
  },
  compatibilitySection: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  compatibilityHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  compatibilityTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  scoreContainer: {
    alignItems: "center",
    marginBottom: 12,
  },
  scoreValue: {
    fontSize: 32,
    fontWeight: "bold",
  },
  scoreLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
  healthAssessment: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  nutritionSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  nutritionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  nutritionItem: {
    flex: 1,
    minWidth: "45%",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    gap: 4,
  },
  nutritionValue: {
    fontSize: 16,
    fontWeight: "bold",
  },
  nutritionLabel: {
    fontSize: 10,
    fontWeight: "500",
    textTransform: "uppercase",
  },
  alertsSection: {
    marginBottom: 20,
  },
  alertsHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  alertItem: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  alertText: {
    fontSize: 14,
    lineHeight: 18,
  },
  recommendationsSection: {
    marginBottom: 20,
  },
  recommendationsHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  recommendationItem: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  recommendationText: {
    fontSize: 14,
    lineHeight: 18,
  },
  ingredientsSection: {
    marginBottom: 20,
  },
  ingredientsList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  ingredientChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  ingredientText: {
    fontSize: 12,
    fontWeight: "500",
  },
  resultActions: {
    padding: 20,
    borderTopWidth: 1,
  },
  addToMealButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  addToMealButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#ffffff",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: width - 40,
    borderRadius: 20,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  modalBody: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  quantityInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    textAlign: "center",
  },
  mealTypeSelector: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  mealTypeOption: {
    flex: 1,
    minWidth: "45%",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
  },
  mealTypeText: {
    fontSize: 12,
    fontWeight: "500",
  },
  modalActions: {
    flexDirection: "row",
    padding: 20,
    borderTopWidth: 1,
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: "600",
  },
  modalAddButton: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  modalAddText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ffffff",
  },
  rtlText: {
    textAlign: "right",
    writingDirection: "rtl",
  },
});