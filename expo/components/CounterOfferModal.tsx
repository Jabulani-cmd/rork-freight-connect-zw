import React, { useState } from 'react';
import { StyleSheet, View, Modal, TouchableOpacity } from 'react-native';
import { Text, Button, TextInput, Slider } from 'react-native-paper';
import { Colors } from '@/constants/colors';
import { X, DollarSign, Percent } from 'lucide-react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/lib/store';

interface CounterOfferModalProps {
  visible: boolean;
  onClose: () => void;
  jobId: string;
  driverId: string;
  currentPrice: number;
  currentDeposit: number;
}

export default function CounterOfferModal({
  visible,
  onClose,
  jobId,
  driverId,
  currentPrice,
  currentDeposit,
}: CounterOfferModalProps) {
  const { user } = useStore();
  const queryClient = useQueryClient();
  const [price, setPrice] = useState(currentPrice.toString());
  const [depositPercentage, setDepositPercentage] = useState(currentDeposit);

  const counterOfferMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');

      const { error } = await supabase.from('quotes').insert({
        job_id: jobId,
        driver_id: driverId,
        price: parseFloat(price),
        deposit_percentage: depositPercentage,
        message: `Counter offer: $${price} with ${depositPercentage}% deposit`,
        status: 'pending',
        is_counter: true,
        countered_by: user.id,
      });

      if (error) throw error;

      await supabase.from('messages').insert({
        job_id: jobId,
        sender_id: user.id,
        content: `I've sent a counter offer: $${price} with ${depositPercentage}% deposit required.`,
        type: 'system',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job', jobId] });
      queryClient.invalidateQueries({ queryKey: ['chat', jobId] });
      onClose();
    },
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>Counter Offer</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>
            Driver's original quote: ${currentPrice} with {currentDeposit}% deposit
          </Text>

          <View style={styles.inputContainer}>
            <DollarSign size={20} color={Colors.primary} />
            <TextInput
              label="Your Offer (USD)"
              value={price}
              onChangeText={setPrice}
              keyboardType="numeric"
              mode="outlined"
              style={styles.input}
              outlineColor={Colors.border}
              activeOutlineColor={Colors.primary}
            />
          </View>

          <View style={styles.depositSection}>
            <View style={styles.depositHeader}>
              <Percent size={20} color={Colors.secondary} />
              <Text style={styles.depositLabel}>Deposit Required: {depositPercentage}%</Text>
            </View>
            <Slider
              value={depositPercentage}
              onValueChange={setDepositPercentage}
              minimumValue={10}
              maximumValue={100}
              step={5}
              minimumTrackTintColor={Colors.primary}
              maximumTrackTintColor={Colors.border}
              thumbTintColor={Colors.primary}
            />
            <View style={styles.depositRange}>
              <Text style={styles.depositRangeText}>10%</Text>
              <Text style={styles.depositRangeText}>100%</Text>
            </View>
          </View>

          <View style={styles.summary}>
            <Text style={styles.summaryText}>
              Deposit amount: ${(parseFloat(price || '0') * depositPercentage / 100).toFixed(2)}
            </Text>
          </View>

          <Button
            mode="contained"
            onPress={() => counterOfferMutation.mutate()}
            loading={counterOfferMutation.isPending}
            disabled={!price || parseFloat(price) <= 0 || counterOfferMutation.isPending}
            style={styles.submitButton}
          >
            Send Counter Offer
          </Button>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  depositSection: {
    marginBottom: 24,
  },
  depositHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  depositLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  depositRange: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  depositRangeText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  summary: {
    backgroundColor: Colors.primary + '10',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  summaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
    textAlign: 'center',
  },
  submitButton: {
    borderRadius: 12,
    backgroundColor: Colors.primary,
  },
});
