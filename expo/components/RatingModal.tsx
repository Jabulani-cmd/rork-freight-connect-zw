import React, { useState } from 'react';
import { StyleSheet, View, Modal, TouchableOpacity } from 'react-native';
import { Text, Button, TextInput, Avatar } from 'react-native-paper';
import { Colors } from '@/constants/colors';
import { Star, X } from 'lucide-react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/lib/store';

interface RatingModalProps {
  visible: boolean;
  onClose: () => void;
  jobId: string;
  revieweeId: string;
  revieweeName: string;
  revieweeRole: 'driver' | 'cargo_owner';
}

export default function RatingModal({
  visible,
  onClose,
  jobId,
  revieweeId,
  revieweeName,
  revieweeRole,
}: RatingModalProps) {
  const { user, profile } = useStore();
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  const submitReviewMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');

      const { error } = await supabase.from('reviews').insert({
        job_id: jobId,
        reviewer_id: user.id,
        reviewee_id: revieweeId,
        rating,
        comment: comment.trim() || null,
      });

      if (error) throw error;

      const { data: reviews } = await supabase
        .from('reviews')
        .select('rating')
        .eq('reviewee_id', revieweeId);

      const avgRating = reviews?.length
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : rating;

      await supabase.from('profiles').update({
        rating: Math.round(avgRating * 10) / 10,
        review_count: reviews?.length || 1,
        updated_at: new Date().toISOString(),
      }).eq('id', revieweeId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job', jobId] });
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      onClose();
      setRating(0);
      setComment('');
    },
  });

  const renderStars = () => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => setRating(star)}
            style={styles.starButton}
          >
            <Star
              size={40}
              color={star <= rating ? Colors.warning : Colors.border}
              fill={star <= rating ? Colors.warning : 'transparent'}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <X size={24} color={Colors.textSecondary} />
          </TouchableOpacity>

          <View style={styles.header}>
            <Avatar.Text
              size={64}
              label={revieweeName.charAt(0).toUpperCase()}
              style={{ backgroundColor: Colors.primary }}
            />
            <Text style={styles.title}>Rate {revieweeName}</Text>
            <Text style={styles.subtitle}>
              How was your experience with this {revieweeRole === 'driver' ? 'driver' : 'cargo owner'}?
            </Text>
          </View>

          {renderStars()}

          <TextInput
            label="Add a comment (optional)"
            value={comment}
            onChangeText={setComment}
            mode="outlined"
            style={styles.commentInput}
            multiline
            numberOfLines={3}
            placeholder="Share your experience..."
            outlineColor={Colors.border}
            activeOutlineColor={Colors.primary}
          />

          <Button
            mode="contained"
            onPress={() => submitReviewMutation.mutate()}
            loading={submitReviewMutation.isPending}
            disabled={rating === 0 || submitReviewMutation.isPending}
            style={styles.submitButton}
          >
            Submit Review
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 24,
    gap: 8,
  },
  starButton: {
    padding: 4,
  },
  commentInput: {
    backgroundColor: Colors.background,
    marginBottom: 24,
  },
  submitButton: {
    borderRadius: 12,
    backgroundColor: Colors.primary,
  },
});
