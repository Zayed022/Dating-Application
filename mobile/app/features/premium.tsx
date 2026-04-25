import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useMutation } from '@tanstack/react-query';
import { subscriptionService } from '../../services/userService';
import { useAuthStore } from '../../store/authStore';
import { Colors, Typography, Spacing, SUBSCRIPTION_PLANS } from '../../constants';

export default function PremiumScreen() {
  const { user, updateUser } = useAuthStore();
  const [selectedPlan, setSelectedPlan] = useState(SUBSCRIPTION_PLANS[1].id);

  const purchaseMutation = useMutation({
    mutationFn: async (planId: string) => {
      const orderRes = await subscriptionService.createOrder(planId);
      return orderRes.data;
    },
    onSuccess: async (orderData) => {
      // In production: open Razorpay checkout with orderData
      // For demo, simulate successful payment
      Alert.alert(
        'Payment',
        `Razorpay checkout would open here.\n\nOrder ID: ${orderData.orderId}\nAmount: ₹${orderData.amount / 100}`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Simulate Payment',
            onPress: async () => {
              try {
                await subscriptionService.verifyPayment({
                  razorpay_payment_id: `pay_${Date.now()}`,
                  razorpay_order_id: orderData.orderId,
                  razorpay_signature: 'simulated_signature',
                  planId: selectedPlan,
                });
                updateUser({ isPremium: true });
                Alert.alert('🎉 Welcome to Premium!', 'Enjoy unlimited features.');
                router.back();
              } catch {
                Alert.alert('Error', 'Payment verification failed');
              }
            },
          },
        ]
      );
    },
    onError: () => Alert.alert('Error', 'Could not initiate payment'),
  });

  const FEATURES_COMPARISON = [
    { label: 'Daily Likes', free: '10', gold: 'Unlimited', platinum: 'Unlimited' },
    { label: 'See Who Liked You', free: '✗', gold: '✓', platinum: '✓' },
    { label: 'Super Likes / Day', free: '1', gold: '5', platinum: '10' },
    { label: 'Rewind Last Swipe', free: '✗', gold: '✓', platinum: '✓' },
    { label: 'Profile Boost', free: '✗', gold: '1/month', platinum: '3/month' },
    { label: 'Priority Matching', free: '✗', gold: '✗', platinum: '✓' },
    { label: 'Message Before Match', free: '✗', gold: '✗', platinum: '✓' },
    { label: 'Profile Badge', free: '✗', gold: '✗', platinum: '✓' },
    { label: 'Advanced Filters', free: '✗', gold: '✗', platinum: '✓' },
    { label: 'Incognito Mode', free: '✗', gold: '✗', platinum: '✓' },
    { label: 'Rent a Buddy', free: '✗', gold: '✓', platinum: '✓' },
    { label: 'Blind Date', free: '✗', gold: '✓', platinum: '✓' },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#F59E0B', '#EC4899', '#7C3AED']}
        style={styles.hero}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.heroEmoji}>💎</Text>
        <Text style={styles.heroTitle}>Sparq Premium</Text>
        <Text style={styles.heroSubtitle}>
          {user?.isPremium
            ? `You're on ${user.premiumPlan?.toUpperCase()} ✓`
            : 'Find love faster with premium'}
        </Text>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Plan Selector */}
        {!user?.isPremium && (
          <>
            <Text style={styles.sectionTitle}>Choose Your Plan</Text>
            <View style={styles.plans}>
              {SUBSCRIPTION_PLANS.map((plan) => {
                const isSelected = selectedPlan === plan.id;
                const isPopular = plan.id === 'platinum_monthly';
                return (
                  <TouchableOpacity
                    key={plan.id}
                    style={[styles.planCard, isSelected && styles.planCardSelected]}
                    onPress={() => setSelectedPlan(plan.id)}
                    activeOpacity={0.8}
                  >
                    {isPopular && (
                      <View style={styles.popularBadge}>
                        <Text style={styles.popularBadgeText}>MOST POPULAR</Text>
                      </View>
                    )}
                    <View style={styles.planTop}>
                      <View>
                        <Text style={[styles.planName, isSelected && styles.planNameSelected]}>
                          {plan.name}
                        </Text>
                        <Text style={styles.planDuration}>
                          {plan.duration === 'monthly' ? 'per month' :
                            plan.duration === 'annual' ? 'per year' : 'per 3 months'}
                        </Text>
                      </View>
                      <View style={styles.planPriceBox}>
                        <Text style={styles.planCurrency}>{plan.currency}</Text>
                        <Text style={[styles.planPrice, isSelected && styles.planPriceSelected]}>
                          {plan.price.toLocaleString()}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.planFeatures}>
                      {plan.features.slice(0, 3).map((f, i) => (
                        <Text key={i} style={styles.planFeature}>✓ {f}</Text>
                      ))}
                    </View>
                    <View style={[styles.radioOuter, isSelected && styles.radioOuterSelected]}>
                      {isSelected && <View style={styles.radioInner} />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* CTA */}
            <TouchableOpacity
              style={[styles.ctaBtn, purchaseMutation.isPending && styles.ctaBtnDisabled]}
              onPress={() => purchaseMutation.mutate(selectedPlan)}
              disabled={purchaseMutation.isPending}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#F59E0B', '#EC4899']}
                style={styles.ctaGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {purchaseMutation.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.ctaBtnText}>
                    🚀 Start Premium · {SUBSCRIPTION_PLANS.find(p => p.id === selectedPlan)?.currency}
                    {SUBSCRIPTION_PLANS.find(p => p.id === selectedPlan)?.price.toLocaleString()}
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <Text style={styles.disclaimer}>
              Secure payment via Razorpay. Cancel anytime.
            </Text>
          </>
        )}

        {user?.isPremium && (
          <View style={styles.activeCard}>
            <Text style={styles.activeEmoji}>🎉</Text>
            <Text style={styles.activeTitle}>Premium Active</Text>
            <Text style={styles.activeSubtitle}>
              Your {user.premiumPlan} plan is active.
              {user.premiumExpiresAt
                ? ` Renews ${new Date(user.premiumExpiresAt).toLocaleDateString()}`
                : ''}
            </Text>
          </View>
        )}

        {/* Comparison Table */}
        <Text style={[styles.sectionTitle, { marginTop: Spacing.xl }]}>
          Feature Comparison
        </Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCell, styles.tableHeaderFeature]}>Feature</Text>
            <Text style={[styles.tableCell, styles.tableHeaderCol]}>Free</Text>
            <Text style={[styles.tableCell, styles.tableHeaderCol, styles.goldCol]}>Gold</Text>
            <Text style={[styles.tableCell, styles.tableHeaderCol, styles.platinumCol]}>Plat.</Text>
          </View>
          {FEATURES_COMPARISON.map((row, i) => (
            <View key={i} style={[styles.tableRow, i % 2 === 0 && styles.tableRowAlt]}>
              <Text style={[styles.tableCell, styles.featureLabel]} numberOfLines={1}>
                {row.label}
              </Text>
              <Text style={[styles.tableCell, styles.tableValue, row.free === '✗' && styles.valueDenied]}>
                {row.free}
              </Text>
              <Text style={[styles.tableCell, styles.tableValue, styles.goldCol,
                row.gold === '✗' ? styles.valueDenied : styles.valueGranted]}>
                {row.gold}
              </Text>
              <Text style={[styles.tableCell, styles.tableValue, styles.platinumCol,
                row.platinum === '✗' ? styles.valueDenied : styles.valueGranted]}>
                {row.platinum}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  hero: {
    paddingTop: 56,
    paddingBottom: Spacing.xl,
    paddingHorizontal: Spacing.base,
    alignItems: 'center',
  },
  backBtn: { position: 'absolute', top: 56, left: Spacing.base, padding: 4 },
  backIcon: { fontSize: 22, color: '#fff' },
  heroEmoji: { fontSize: 48, marginBottom: Spacing.sm },
  heroTitle: {
    fontSize: Typography.sizes['2xl'],
    fontWeight: Typography.weights.extrabold,
    color: '#fff',
    marginBottom: 4,
  },
  heroSubtitle: { color: 'rgba(255,255,255,0.85)', fontSize: Typography.sizes.base },
  content: { padding: Spacing.base, paddingBottom: 60 },
  sectionTitle: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.md,
    marginTop: Spacing.sm,
  },
  plans: { gap: 12, marginBottom: Spacing.xl },
  planCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: 18,
    padding: Spacing.base,
    borderWidth: 2,
    borderColor: Colors.border,
    position: 'relative',
    overflow: 'hidden',
  },
  planCardSelected: { borderColor: Colors.primary },
  popularBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: Colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderBottomLeftRadius: 10,
  },
  popularBadgeText: { color: '#fff', fontSize: 9, fontWeight: Typography.weights.bold, letterSpacing: 0.5 },
  planTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  planName: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    color: Colors.textPrimary,
  },
  planNameSelected: { color: Colors.primary },
  planDuration: { color: Colors.textMuted, fontSize: Typography.sizes.xs, marginTop: 2 },
  planPriceBox: { flexDirection: 'row', alignItems: 'flex-start' },
  planCurrency: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    marginTop: 4,
    marginRight: 1,
  },
  planPrice: {
    fontSize: Typography.sizes['2xl'],
    fontWeight: Typography.weights.extrabold,
    color: Colors.textPrimary,
  },
  planPriceSelected: { color: Colors.primary },
  planFeatures: { gap: 3, marginBottom: Spacing.sm },
  planFeature: { color: Colors.textSecondary, fontSize: Typography.sizes.sm },
  radioOuter: {
    position: 'absolute',
    bottom: Spacing.md,
    right: Spacing.md,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: { borderColor: Colors.primary },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary },
  ctaBtn: { borderRadius: 16, overflow: 'hidden', marginBottom: Spacing.sm },
  ctaBtnDisabled: { opacity: 0.7 },
  ctaGradient: { paddingVertical: 16, alignItems: 'center' },
  ctaBtnText: { color: '#fff', fontSize: Typography.sizes.md, fontWeight: Typography.weights.bold },
  disclaimer: { color: Colors.textMuted, fontSize: Typography.sizes.xs, textAlign: 'center', marginBottom: Spacing.xl },
  activeCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: 18,
    padding: Spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.secondary,
    marginBottom: Spacing.xl,
  },
  activeEmoji: { fontSize: 40, marginBottom: Spacing.sm },
  activeTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  activeSubtitle: { color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  table: {
    backgroundColor: Colors.bgCard,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: Colors.bgElevated,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  tableHeaderFeature: { color: Colors.textSecondary, fontWeight: Typography.weights.semibold },
  tableHeaderCol: { color: Colors.textSecondary, fontWeight: Typography.weights.semibold, textAlign: 'center' },
  tableRow: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 4 },
  tableRowAlt: { backgroundColor: `${Colors.bgElevated}50` },
  tableCell: { flex: 1, fontSize: Typography.sizes.xs, color: Colors.textPrimary, paddingHorizontal: 2 },
  featureLabel: { flex: 2, color: Colors.textSecondary },
  tableValue: { textAlign: 'center', fontWeight: Typography.weights.medium },
  goldCol: { color: '#FCD34D' },
  platinumCol: { color: Colors.accentLight },
  valueDenied: { color: Colors.textMuted },
  valueGranted: { fontWeight: Typography.weights.bold },
});
