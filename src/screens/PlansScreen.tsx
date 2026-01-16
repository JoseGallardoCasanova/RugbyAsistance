import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { usePreferences } from '../context/PreferencesContext';
import { PlanType, PLANES } from '../types/index';

interface PlansScreenProps {
  navigation: any;
}

export default function PlansScreen({ navigation }: PlansScreenProps) {
  const { currentColors, fontSizes } = usePreferences();
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('pro');

  const handleContinue = () => {
    navigation.navigate('RegisterOrg', { plan: selectedPlan });
  };

  const handleBack = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentColors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: currentColors.primary }]}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Text style={[styles.backIcon, { fontSize: fontSizes.xl }]}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={[styles.title, { fontSize: fontSizes.xxl }]}>Elige tu plan</Text>
          <Text style={[styles.subtitle, { fontSize: fontSizes.sm }]}>
            Selecciona el plan que mejor se ajuste a tus necesidades
          </Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Plans */}
        {(Object.keys(PLANES) as PlanType[]).map((planKey) => {
          const plan = PLANES[planKey];
          const isSelected = selectedPlan === planKey;

          return (
            <TouchableOpacity
              key={planKey}
              style={[
                styles.planCard,
                { backgroundColor: currentColors.backgroundWhite, borderColor: currentColors.border },
                isSelected && { borderColor: currentColors.primary, borderWidth: 3 },
                plan.recomendado && styles.planRecomendado,
              ]}
              onPress={() => setSelectedPlan(planKey)}
              activeOpacity={0.7}
            >
              {plan.recomendado && (
                <View style={[styles.badge, { backgroundColor: currentColors.primary }]}>
                  <Text style={[styles.badgeText, { fontSize: fontSizes.xs }]}>
                    ⭐ Recomendado
                  </Text>
                </View>
              )}

              {/* Plan header */}
              <View style={styles.planHeader}>
                <Text style={[styles.planName, { fontSize: fontSizes.lg, color: currentColors.textPrimary }]}>
                  {plan.nombre}
                </Text>
                <View style={styles.priceContainer}>
                  <Text style={[styles.price, { fontSize: fontSizes.xxxl, color: currentColors.primary }]}>
                    ${plan.precio_mensual}
                  </Text>
                  <Text style={[styles.priceUnit, { fontSize: fontSizes.sm, color: currentColors.textSecondary }]}>
                    /mes
                  </Text>
                </View>
              </View>

              {/* Features */}
              <View style={styles.features}>
                {plan.features.map((feature, index) => (
                  <View key={index} style={styles.featureRow}>
                    <Text style={[styles.featureIcon, { color: currentColors.primary }]}>✓</Text>
                    <Text style={[styles.featureText, { fontSize: fontSizes.sm, color: currentColors.textPrimary }]}>
                      {feature}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Selection indicator */}
              {isSelected && (
                <View style={[styles.selectedIndicator, { backgroundColor: currentColors.primary }]}>
                  <Text style={[styles.selectedText, { fontSize: fontSizes.sm }]}>
                    ✓ Seleccionado
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}

        {/* Info */}
        <View style={[styles.infoBox, { backgroundColor: currentColors.backgroundWhite, borderColor: currentColors.border }]}>
          <Text style={[styles.infoIcon, { fontSize: fontSizes.xl }]}>💡</Text>
          <Text style={[styles.infoText, { fontSize: fontSizes.sm, color: currentColors.textSecondary }]}>
            Puedes cambiar de plan en cualquier momento. Los planes Pro y Enterprise incluyen 14 días de prueba gratis.
          </Text>
        </View>
      </ScrollView>

      {/* Continue button */}
      <View style={[styles.footer, { backgroundColor: currentColors.backgroundWhite, borderTopColor: currentColors.border }]}>
        <TouchableOpacity
          style={[styles.continueButton, { backgroundColor: currentColors.primary }]}
          onPress={handleContinue}
          activeOpacity={0.8}
        >
          <Text style={[styles.continueButtonText, { fontSize: fontSizes.md }]}>
            Continuar con {PLANES[selectedPlan].nombre}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  backButton: {
    marginBottom: 10,
  },
  backIcon: {
    color: '#fff',
  },
  headerContent: {
    gap: 5,
  },
  title: {
    color: '#fff',
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#fff',
    opacity: 0.9,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  planCard: {
    borderRadius: 16,
    borderWidth: 2,
    padding: 20,
    marginBottom: 20,
    position: 'relative',
  },
  planRecomendado: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  badge: {
    position: 'absolute',
    top: -10,
    right: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  planHeader: {
    marginBottom: 20,
  },
  planName: {
    fontWeight: 'bold',
    marginBottom: 10,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 5,
  },
  price: {
    fontWeight: 'bold',
  },
  priceUnit: {
    marginBottom: 8,
  },
  features: {
    gap: 12,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureIcon: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  featureText: {
    flex: 1,
  },
  selectedIndicator: {
    marginTop: 15,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  selectedText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  infoBox: {
    flexDirection: 'row',
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
    marginBottom: 20,
  },
  infoIcon: {
    marginTop: 2,
  },
  infoText: {
    flex: 1,
    lineHeight: 20,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
  },
  continueButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  continueButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
