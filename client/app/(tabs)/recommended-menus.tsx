import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Animated,
  Modal,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/src/i18n/context/LanguageContext";
import { useTheme } from "@/src/context/ThemeContext";
import {
  ChefHat,
  Plus,
  Sparkles,
  Calendar,
  Clock,
  DollarSign,
  Users,
  Star,
  Eye,
  Play,
  X,
  Send,
  Utensils,
  Target,
  TrendingUp,
  Award,
  Filter,
  Search,
} from "lucide-react-native";
import { api } from "@/src/services/api";
import LoadingScreen from "@/components/LoadingScreen";
import { router } from "expo-router";

const { width } = Dimensions.get("window");

interface RecommendedMenu {
  menu_id: string;
  title: string;
  description?: string;
  total_calories: number;
  total_protein?: number;
  total_carbs?: number;
  total_fat?: number;
  total_fiber?: number;
  days_count: number;
  dietary_category?: string;
  estimated_cost?: number;
  prep_time_minutes?: number;
  difficulty_level: number;
  is_active: boolean;
  created_at: string;
  meals: Array<{
    meal_id: string;
    name: string;
    meal_type: string;
    day_number: number;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber?: number;
    prep_time_minutes?: number;
    cooking_method?: string;
    instructions?: string;
    ingredients: Array<{
      ingredient_id: string;
      name: string;
      quantity: number;
      unit: string;
      category?: string;
      estimated_cost?: number;
    }>;
  }>;
}

export default function RecommendedMenusScreen() {
  const { t } = useTranslation();
  const { isRTL, language } = useLanguage();
  const { colors, isDark } = useTheme();

  const [menus, setMenus] = useState<RecommendedMenu[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customRequest, setCustomRequest] = useState("");
  const [selectedDays, setSelectedDays] = useState(7);
  const [selectedMealsPerDay, setSelectedMealsPerDay] = useState("3_main");
  const [budget, setBudget] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");

  // Animation values
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));

  useEffect(() => {
    loadRecommendedMenus();
    
    // Start animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const loadRecommendedMenus = async () => {
    try {
      console.log("🔄 Loading recommended menus...");
      const response = await api.get("/recommended-menus");

      if (response.data.success) {
        setMenus(response.data.data || []);
        console.log("✅ Loaded", response.data.data?.length || 0, "menus");
      } else {
        console.log("⚠️ No menus found or API returned error");
        setMenus([]);
      }
    } catch (error) {
      console.error("💥 Error loading menus:", error);
      setMenus([]);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadRecommendedMenus();
    setRefreshing(false);
  }, []);

  const handleGenerateMenu = async () => {
    try {
      setIsGenerating(true);
      console.log("🤖 Generating new menu...");

      const response = await api.post("/recommended-menus/generate", {
        days: 7,
        mealsPerDay: "3_main",
        mealChangeFrequency: "daily",
        includeLeftovers: false,
        sameMealTimes: true,
      });

      if (response.data.success) {
        Alert.alert(
          language === "he" ? "הצלחה!" : "Success!",
          language === "he" 
            ? "תפריט חדש נוצר בהצלחה!"
            : "New menu generated successfully!",
          [
            {
              text: language === "he" ? "אישור" : "OK",
              onPress: () => loadRecommendedMenus(),
            },
          ]
        );
      } else {
        throw new Error(response.data.error || "Failed to generate menu");
      }
    } catch (error: any) {
      console.error("💥 Error generating menu:", error);
      Alert.alert(
        language === "he" ? "שגיאה" : "Error",
        error.message || (language === "he" 
          ? "נכשל ביצירת תפריט חדש"
          : "Failed to generate new menu")
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateCustomMenu = async () => {
    if (!customRequest.trim()) {
      Alert.alert(
        language === "he" ? "שגיאה" : "Error",
        language === "he" 
          ? "אנא הכנס תיאור לתפריט המותאם"
          : "Please enter a description for the custom menu"
      );
      return;
    }

    try {
      setIsGenerating(true);
      console.log("🎨 Generating custom menu...");

      const response = await api.post("/recommended-menus/generate-custom", {
        days: selectedDays,
        mealsPerDay: selectedMealsPerDay,
        customRequest: customRequest.trim(),
        budget: budget ? parseFloat(budget) : undefined,
        mealChangeFrequency: "daily",
        includeLeftovers: false,
        sameMealTimes: true,
      });

      if (response.data.success) {
        setShowCustomModal(false);
        setCustomRequest("");
        setBudget("");
        
        Alert.alert(
          language === "he" ? "הצלחה!" : "Success!",
          language === "he" 
            ? "תפריט מותאם נוצר בהצלחה!"
            : "Custom menu generated successfully!",
          [
            {
              text: language === "he" ? "אישור" : "OK",
              onPress: () => loadRecommendedMenus(),
            },
          ]
        );
      } else {
        throw new Error(response.data.error || "Failed to generate custom menu");
      }
    } catch (error: any) {
      console.error("💥 Error generating custom menu:", error);
      Alert.alert(
        language === "he" ? "שגיאה" : "Error",
        error.message || (language === "he" 
          ? "נכשל ביצירת תפריט מותאם"
          : "Failed to generate custom menu")
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStartMenu = async (menuId: string) => {
    try {
      console.log("🚀 Starting menu:", menuId);
      
      const response = await api.post(`/recommended-menus/${menuId}/start-today`);
      
      if (response.data.success) {
        Alert.alert(
          language === "he" ? "הצלחה!" : "Success!",
          language === "he" 
            ? "התפריט הופעל בהצלחה!"
            : "Menu started successfully!",
          [
            {
              text: language === "he" ? "אישור" : "OK",
            },
          ]
        );
      }
    } catch (error: any) {
      console.error("💥 Error starting menu:", error);
      Alert.alert(
        language === "he" ? "שגיאה" : "Error",
        error.message || (language === "he" 
          ? "נכשל בהפעלת התפריט"
          : "Failed to start menu")
      );
    }
  };

  const filteredMenus = useMemo(() => {
    return menus.filter(menu => {
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          menu.title.toLowerCase().includes(query) ||
          menu.description?.toLowerCase().includes(query) ||
          menu.dietary_category?.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Category filter
      if (selectedFilter !== "all") {
        if (selectedFilter === "recent" && menu.created_at) {
          const menuDate = new Date(menu.created_at);
          const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          if (menuDate < weekAgo) return false;
        } else if (selectedFilter === "high_protein") {
          const proteinRatio = (menu.total_protein || 0) / (menu.total_calories || 1) * 4;
          if (proteinRatio < 0.25) return false;
        } else if (selectedFilter === "low_calorie") {
          const avgCaloriesPerDay = menu.total_calories / (menu.days_count || 1);
          if (avgCaloriesPerDay > 1800) return false;
        }
      }

      return true;
    });
  }, [menus, searchQuery, selectedFilter]);

  const renderMenuCard = (menu: RecommendedMenu, index: number) => {
    const avgCaloriesPerDay = Math.round(menu.total_calories / (menu.days_count || 1));
    const avgProteinPerDay = Math.round((menu.total_protein || 0) / (menu.days_count || 1));

    return (
      <Animated.View
        key={menu.menu_id}
        style={[
          styles.menuCard,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            opacity: fadeAnim,
            transform: [
              {
                translateY: slideAnim.interpolate({
                  inputRange: [0, 50],
                  outputRange: [0, 50 + index * 10],
                }),
              },
            ],
          },
        ]}
      >
        {/* Header */}
        <LinearGradient
          colors={isDark ? ["#047857", "#059669"] : ["#10b981", "#059669"]}
          style={styles.cardHeader}
        >
          <View style={[styles.headerContent, isRTL && styles.rtlRow]}>
            <View style={styles.headerLeft}>
              <ChefHat size={24} color="#ffffff" />
              <View style={styles.headerText}>
                <Text style={[styles.menuTitle, isRTL && styles.rtlText]}>
                  {menu.title}
                </Text>
                <Text style={[styles.menuDate, isRTL && styles.rtlText]}>
                  {new Date(menu.created_at).toLocaleDateString(
                    language === "he" ? "he-IL" : "en-US"
                  )}
                </Text>
              </View>
            </View>
            <View style={styles.daysContainer}>
              <Text style={styles.daysNumber}>{menu.days_count}</Text>
              <Text style={styles.daysLabel}>
                {language === "he" ? "ימים" : "days"}
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* Content */}
        <View style={styles.cardContent}>
          {/* Description */}
          {menu.description && (
            <Text style={[styles.description, { color: colors.text }, isRTL && styles.rtlText]}>
              {menu.description}
            </Text>
          )}

          {/* Nutrition Summary */}
          <View style={styles.nutritionSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }, isRTL && styles.rtlText]}>
              {language === "he" ? "סיכום תזונתי יומי" : "Daily Nutrition Summary"}
            </Text>
            
            <View style={styles.nutritionGrid}>
              <View style={[styles.nutritionCard, { backgroundColor: colors.surface }]}>
                <Target size={20} color="#ef4444" />
                <Text style={[styles.nutritionValue, { color: colors.text }]}>
                  {avgCaloriesPerDay}
                </Text>
                <Text style={[styles.nutritionLabel, { color: colors.icon }]}>
                  {language === "he" ? "קלוריות" : "Calories"}
                </Text>
              </View>
              
              <View style={[styles.nutritionCard, { backgroundColor: colors.surface }]}>
                <TrendingUp size={20} color="#3b82f6" />
                <Text style={[styles.nutritionValue, { color: colors.text }]}>
                  {avgProteinPerDay}g
                </Text>
                <Text style={[styles.nutritionLabel, { color: colors.icon }]}>
                  {language === "he" ? "חלבון" : "Protein"}
                </Text>
              </View>
              
              <View style={[styles.nutritionCard, { backgroundColor: colors.surface }]}>
                <Award size={20} color="#10b981" />
                <Text style={[styles.nutritionValue, { color: colors.text }]}>
                  {menu.meals.length}
                </Text>
                <Text style={[styles.nutritionLabel, { color: colors.icon }]}>
                  {language === "he" ? "ארוחות" : "Meals"}
                </Text>
              </View>
            </View>
          </View>

          {/* Meal Preview */}
          <View style={styles.mealsPreview}>
            <Text style={[styles.sectionTitle, { color: colors.text }, isRTL && styles.rtlText]}>
              {language === "he" ? "ארוחות לדוגמה" : "Sample Meals"}
            </Text>
            
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.mealsScrollContainer}
            >
              {menu.meals.slice(0, 4).map((meal, mealIndex) => (
                <View 
                  key={meal.meal_id} 
                  style={[styles.mealPreviewCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                >
                  <Utensils size={16} color={colors.emerald500} />
                  <Text 
                    style={[styles.mealPreviewName, { color: colors.text }]}
                    numberOfLines={2}
                  >
                    {meal.name}
                  </Text>
                  <Text style={[styles.mealPreviewCalories, { color: colors.emerald500 }]}>
                    {meal.calories} {language === "he" ? "קלוריות" : "cal"}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>

          {/* Cost and Time Info */}
          <View style={styles.infoRow}>
            {menu.estimated_cost && (
              <View style={[styles.infoItem, isRTL && styles.rtlRow]}>
                <DollarSign size={16} color={colors.icon} />
                <Text style={[styles.infoText, { color: colors.text }]}>
                  ₪{menu.estimated_cost.toFixed(0)}
                </Text>
              </View>
            )}
            
            {menu.prep_time_minutes && (
              <View style={[styles.infoItem, isRTL && styles.rtlRow]}>
                <Clock size={16} color={colors.icon} />
                <Text style={[styles.infoText, { color: colors.text }]}>
                  {menu.prep_time_minutes} {language === "he" ? "דק'" : "min"}
                </Text>
              </View>
            )}
            
            <View style={[styles.infoItem, isRTL && styles.rtlRow]}>
              <Star size={16} color="#fbbf24" />
              <Text style={[styles.infoText, { color: colors.text }]}>
                {menu.difficulty_level}/5
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={[styles.actionButtons, isRTL && styles.rtlRow]}>
            <TouchableOpacity
              style={[styles.secondaryButton, { borderColor: colors.emerald500 }]}
              onPress={() => router.push(`/menu/${menu.menu_id}`)}
            >
              <Eye size={16} color={colors.emerald500} />
              <Text style={[styles.secondaryButtonText, { color: colors.emerald500 }]}>
                {language === "he" ? "צפה" : "View"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.emerald500 }]}
              onPress={() => handleStartMenu(menu.menu_id)}
            >
              <Play size={16} color="#ffffff" />
              <Text style={styles.primaryButtonText}>
                {language === "he" ? "התחל" : "Start"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    );
  };

  const renderCustomModal = () => (
    <Modal
      visible={showCustomModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowCustomModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {language === "he" ? "צור תפריט מותאם" : "Create Custom Menu"}
            </Text>
            <TouchableOpacity onPress={() => setShowCustomModal(false)}>
              <X size={24} color={colors.icon} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>
                {language === "he" ? "תאר את התפריט הרצוי" : "Describe your desired menu"}
              </Text>
              <TextInput
                style={[styles.textInput, { 
                  backgroundColor: colors.card, 
                  borderColor: colors.border,
                  color: colors.text 
                }]}
                placeholder={language === "he" 
                  ? "לדוגמה: תפריט ים תיכוני עם דגים ופחמימות מורכבות"
                  : "e.g., Mediterranean menu with fish and complex carbs"
                }
                placeholderTextColor={colors.icon}
                value={customRequest}
                onChangeText={setCustomRequest}
                multiline
                numberOfLines={3}
                textAlign={isRTL ? "right" : "left"}
              />
            </View>

            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: isRTL ? 0 : 12, marginLeft: isRTL ? 12 : 0 }]}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>
                  {language === "he" ? "מספר ימים" : "Number of days"}
                </Text>
                <View style={styles.daysSelector}>
                  {[3, 7, 14].map(days => (
                    <TouchableOpacity
                      key={days}
                      style={[
                        styles.dayOption,
                        { borderColor: colors.border },
                        selectedDays === days && { backgroundColor: colors.emerald500 }
                      ]}
                      onPress={() => setSelectedDays(days)}
                    >
                      <Text style={[
                        styles.dayOptionText,
                        { color: selectedDays === days ? "#ffffff" : colors.text }
                      ]}>
                        {days}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>
                  {language === "he" ? "תקציב יומי (₪)" : "Daily budget (₪)"}
                </Text>
                <TextInput
                  style={[styles.textInput, { 
                    backgroundColor: colors.card, 
                    borderColor: colors.border,
                    color: colors.text 
                  }]}
                  placeholder="50"
                  placeholderTextColor={colors.icon}
                  value={budget}
                  onChangeText={setBudget}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </ScrollView>

          <View style={[styles.modalActions, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.modalCancelButton, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => setShowCustomModal(false)}
            >
              <Text style={[styles.modalCancelText, { color: colors.text }]}>
                {language === "he" ? "ביטול" : "Cancel"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalCreateButton, { backgroundColor: colors.emerald500 }]}
              onPress={handleGenerateCustomMenu}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Send size={16} color="#ffffff" />
                  <Text style={styles.modalCreateText}>
                    {language === "he" ? "צור" : "Create"}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  if (isLoading) {
    return (
      <LoadingScreen 
        text={language === "he" ? "טוען תפריטים מומלצים..." : "Loading recommended menus..."} 
      />
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={[styles.title, { color: colors.text }, isRTL && styles.rtlText]}>
              {language === "he" ? "תפריטים מומלצים" : "Recommended Menus"}
            </Text>
            <Text style={[styles.subtitle, { color: colors.icon }, isRTL && styles.rtlText]}>
              {language === "he" 
                ? "תפריטים מותאמים אישית עבורך"
                : "Personalized menus created for you"
              }
            </Text>
          </View>
          
          <TouchableOpacity
            style={[styles.generateButton, { backgroundColor: colors.emerald500 }]}
            onPress={() => setShowCustomModal(true)}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Plus size={20} color="#ffffff" />
            )}
          </TouchableOpacity>
        </View>

        {/* Search and Filter */}
        <View style={styles.searchSection}>
          <View style={[styles.searchContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Search size={16} color={colors.icon} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder={language === "he" ? "חפש תפריטים..." : "Search menus..."}
              placeholderTextColor={colors.icon}
              value={searchQuery}
              onChangeText={setSearchQuery}
              textAlign={isRTL ? "right" : "left"}
            />
          </View>

          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersContainer}
          >
            {[
              { key: "all", label: language === "he" ? "הכל" : "All" },
              { key: "recent", label: language === "he" ? "חדשים" : "Recent" },
              { key: "high_protein", label: language === "he" ? "עתיר חלבון" : "High Protein" },
              { key: "low_calorie", label: language === "he" ? "דל קלוריות" : "Low Calorie" },
            ].map(filter => (
              <TouchableOpacity
                key={filter.key}
                style={[
                  styles.filterChip,
                  { borderColor: colors.border },
                  selectedFilter === filter.key && { backgroundColor: colors.emerald500 }
                ]}
                onPress={() => setSelectedFilter(filter.key)}
              >
                <Text style={[
                  styles.filterChipText,
                  { color: selectedFilter === filter.key ? "#ffffff" : colors.text }
                ]}>
                  {filter.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.emerald500]}
            tintColor={colors.emerald500}
          />
        }
      >
        {filteredMenus.length > 0 ? (
          <>
            {/* Stats Overview */}
            <View style={[styles.statsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <LinearGradient
                colors={isDark ? ["#047857", "#059669"] : ["#ecfdf5", "#d1fae5"]}
                style={styles.statsGradient}
              >
                <View style={styles.statsHeader}>
                  <Sparkles size={20} color={colors.emerald500} />
                  <Text style={[styles.statsTitle, { color: colors.emerald700 }]}>
                    {language === "he" ? "הסטטיסטיקות שלך" : "Your Stats"}
                  </Text>
                </View>
                
                <View style={styles.statsGrid}>
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: colors.emerald700 }]}>
                      {filteredMenus.length}
                    </Text>
                    <Text style={[styles.statLabel, { color: colors.emerald600 }]}>
                      {language === "he" ? "תפריטים" : "Menus"}
                    </Text>
                  </View>
                  
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: colors.emerald700 }]}>
                      {filteredMenus.reduce((sum, menu) => sum + menu.meals.length, 0)}
                    </Text>
                    <Text style={[styles.statLabel, { color: colors.emerald600 }]}>
                      {language === "he" ? "ארוחות" : "Meals"}
                    </Text>
                  </View>
                  
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: colors.emerald700 }]}>
                      {Math.round(filteredMenus.reduce((sum, menu) => sum + menu.total_calories, 0) / filteredMenus.length) || 0}
                    </Text>
                    <Text style={[styles.statLabel, { color: colors.emerald600 }]}>
                      {language === "he" ? "קלוריות ממוצע" : "Avg Calories"}
                    </Text>
                  </View>
                </View>
              </LinearGradient>
            </View>

            {/* Menu Cards */}
            {filteredMenus.map(renderMenuCard)}
          </>
        ) : (
          <View style={styles.emptyState}>
            <ChefHat size={64} color={colors.icon} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {language === "he" ? "אין תפריטים זמינים" : "No menus available"}
            </Text>
            <Text style={[styles.emptyText, { color: colors.icon }]}>
              {language === "he" 
                ? "צור תפריט מותאם אישית כדי להתחיל"
                : "Create a custom menu to get started"
              }
            </Text>
            
            <TouchableOpacity
              style={[styles.createFirstButton, { backgroundColor: colors.emerald500 }]}
              onPress={() => setShowCustomModal(true)}
            >
              <Plus size={20} color="#ffffff" />
              <Text style={styles.createFirstButtonText}>
                {language === "he" ? "צור תפריט ראשון" : "Create First Menu"}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.emerald500 }]}
        onPress={handleGenerateMenu}
        disabled={isGenerating}
      >
        {isGenerating ? (
          <ActivityIndicator size="small" color="#ffffff" />
        ) : (
          <Sparkles size={24} color="#ffffff" />
        )}
      </TouchableOpacity>

      {renderCustomModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 22,
  },
  generateButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  searchSection: {
    gap: 12,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  filtersContainer: {
    paddingRight: 20,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "500",
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  statsCard: {
    borderRadius: 16,
    marginBottom: 20,
    overflow: "hidden",
    borderWidth: 1,
  },
  statsGradient: {
    padding: 20,
  },
  statsHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 8,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
  menuCard: {
    borderRadius: 16,
    marginBottom: 20,
    overflow: "hidden",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardHeader: {
    padding: 20,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  headerText: {
    marginLeft: 12,
    flex: 1,
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 4,
  },
  menuDate: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
  },
  daysContainer: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  daysNumber: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#ffffff",
  },
  daysLabel: {
    fontSize: 10,
    color: "rgba(255, 255, 255, 0.8)",
    fontWeight: "600",
  },
  cardContent: {
    padding: 20,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
    fontStyle: "italic",
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
    gap: 12,
  },
  nutritionCard: {
    flex: 1,
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    gap: 4,
  },
  nutritionValue: {
    fontSize: 18,
    fontWeight: "bold",
  },
  nutritionLabel: {
    fontSize: 10,
    fontWeight: "500",
    textTransform: "uppercase",
  },
  mealsPreview: {
    marginBottom: 20,
  },
  mealsScrollContainer: {
    paddingRight: 20,
    gap: 12,
  },
  mealPreviewCard: {
    width: 120,
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    gap: 6,
  },
  mealPreviewName: {
    fontSize: 11,
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 14,
  },
  mealPreviewCalories: {
    fontSize: 10,
    fontWeight: "600",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 20,
    paddingVertical: 12,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  infoText: {
    fontSize: 12,
    fontWeight: "500",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  primaryButton: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ffffff",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  createFirstButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  createFirstButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ffffff",
  },
  fab: {
    position: "absolute",
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: width - 40,
    maxHeight: "80%",
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
    maxHeight: 400,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    minHeight: 44,
  },
  inputRow: {
    flexDirection: "row",
    gap: 12,
  },
  daysSelector: {
    flexDirection: "row",
    gap: 8,
  },
  dayOption: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
  },
  dayOptionText: {
    fontSize: 14,
    fontWeight: "600",
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
  modalCreateButton: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  modalCreateText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ffffff",
  },
  rtlText: {
    textAlign: "right",
    writingDirection: "rtl",
  },
  rtlRow: {
    flexDirection: "row-reverse",
  },
});