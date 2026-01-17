import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Linking,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';

interface NewsItem {
  title: string;
  description: string;
  url: string;
  urlToImage: string;
  publishedAt: string;
}

interface NewsCardProps {
  item: NewsItem;
  index: number;
  textColor: string;
  accentColor: string;
}

const NewsCard: React.FC<NewsCardProps> = ({
  item,
  index,
  textColor,
  accentColor,
}) => {
  const handlePress = () => {
    Linking.openURL(item.url);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return date.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    }
  };

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: '#ffffff', borderColor: '#e0e0e0' }]}
      onPress={handlePress}
      activeOpacity={0.9}
    >
      {item.urlToImage ? (
        <Image
          source={{ uri: item.urlToImage }}
          style={styles.image}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.image, styles.placeholderImage]}>
          <FontAwesome name="newspaper-o" size={40} color="#ccc" />
        </View>
      )}

      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: textColor }]} numberOfLines={2}>
            {item.title}
          </Text>
          <View style={[styles.badge, { backgroundColor: accentColor }]}>
            <Text style={styles.badgeText}>News</Text>
          </View>
        </View>

        <Text
          style={[styles.description, { color: textColor }]}
          numberOfLines={3}
        >
          {item.description || 'Read more for full story...'}
        </Text>

        <View style={styles.footer}>
          <View style={styles.dateContainer}>
            <FontAwesome name="clock-o" size={12} color="#888" />
            <Text style={styles.date}>{formatDate(item.publishedAt)}</Text>
          </View>
          <View style={styles.indexIndicator}>
            <Text style={styles.indexText}>{index + 1}</Text>
          </View>
        </View>
      </View>

      {/* Swipe indicator */}
      <View style={styles.swipeIndicator}>
        <FontAwesome name="chevron-up" size={20} color={accentColor} />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
    boxShadow: '0px 8px 12px rgba(0, 0, 0, 0.12)',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    marginBottom: 40, // Space between cards for stacking effect
  },
  image: {
    width: '100%',
    height: 180,
    backgroundColor: '#f5f5f5',
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    lineHeight: 24,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    minWidth: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
    color: '#666',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  date: {
    fontSize: 12,
    color: '#888',
  },
  indexIndicator: {
    backgroundColor: '#f5f5f5',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  indexText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  swipeIndicator: {
    position: 'absolute',
    top: 12,
    right: 12,
    opacity: 0.6,
  },
});

export default NewsCard;
