// Example: Updated Tasks Screen Using New Design System
// This shows HOW to apply the new designs to your existing screens

import React, { useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import {
  Colors,
  Spacing,
  BorderRadius,
  Typography,
  Shadows,
  TypographyPresets,
} from '../constants/newDesignSystem';
import {
  StyledHeader,
  StyledCard,
  PrimaryCard,
  StyledButton,
  StatusBadge,
  Heading2,
  BodyText,
  CaptionText,
} from '../components/StyledComponents';

/**
 * EXAMPLE: Updated Tasks Screen
 *
 * This demonstrates how to:
 * 1. Use the new design system colors and spacing
 * 2. Implement the header with caption and title
 * 3. Create the primary voice command card
 * 4. Style task lists and items
 * 5. Apply consistent typography and spacing
 *
 * Apply these same patterns to:
 * - profile.tsx
 * - rent.tsx
 * - other screens
 */

interface Task {
  id: string;
  title: string;
  dueDate: string;
  priority: 'high' | 'medium' | 'low';
  category: 'farming' | 'personal' | 'general';
  completed: boolean;
}

const EXAMPLE_TASKS: Task[] = [
  {
    id: '1',
    title: 'Water the wheat field',
    dueDate: 'Today, 6:00 PM',
    priority: 'high',
    category: 'farming',
    completed: false,
  },
  {
    id: '2',
    title: 'Check irrigation system',
    dueDate: 'Tomorrow, 8:00 AM',
    priority: 'high',
    category: 'farming',
    completed: false,
  },
  {
    id: '3',
    title: 'Order fertilizer',
    dueDate: 'Next week',
    priority: 'medium',
    category: 'farming',
    completed: false,
  },
  {
    id: '4',
    title: 'Fill vehicle fuel',
    dueDate: 'Today, 4:00 PM',
    priority: 'low',
    category: 'personal',
    completed: false,
  },
];

export default function UpdatedTasksScreenExample() {
  const [isListening, setIsListening] = useState(false);
  const [tasks, setTasks] = useState(EXAMPLE_TASKS);

  // Group tasks by priority
  const highPriorityTasks = tasks.filter((t) => t.priority === 'high' && !t.completed);
  const mediumPriorityTasks = tasks.filter((t) => t.priority === 'medium' && !t.completed);
  const lowPriorityTasks = tasks.filter((t) => t.priority === 'low' && !t.completed);

  const handleToggleTask = (id: string) => {
    setTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.id === id ? { ...task, completed: !task.completed } : task
      )
    );
  };

  const handleVoiceCommand = () => {
    setIsListening(!isListening);
  };

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: Colors.background.light },
      ]}
    >
      {/* ==================== HEADER ==================== */}
      <StyledHeader
        title="My Tasks"
        subtitle="FARM OPERATIONS"
        rightActions={
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => console.log('History')}
            >
              <MaterialIcons
                name="history"
                size={20}
                color={Colors.text.secondary}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => console.log('Filter')}
            >
              <MaterialIcons
                name="tune"
                size={20}
                color={Colors.text.secondary}
              />
            </TouchableOpacity>
          </View>
        }
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* ==================== VOICE COMMAND CARD ==================== */}
        <PrimaryCard>
          <View style={styles.voiceCardContent}>
            <View style={styles.voiceInfo}>
              <View style={styles.voiceIconContainer}>
                <MaterialIcons name="mic" size={24} color={Colors.white} />
              </View>
              <View>
                <Text style={styles.voiceTitle}>Voice Command</Text>
                <Text style={styles.voiceSubtitle}>
                  "Add task: Check irrigation..."
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={handleVoiceCommand}
              style={[
                styles.voiceButton,
                isListening && styles.voiceButtonActive,
              ]}
              activeOpacity={0.7}
            >
              <View style={styles.voiceWaveform}>
                <View style={[styles.waveBars, { height: '40%' }]} />
                <View style={[styles.waveBars, { height: '70%' }]} />
                <View style={[styles.waveBars, { height: '40%' }]} />
              </View>
            </TouchableOpacity>
          </View>
        </PrimaryCard>

        {/* ==================== HIGH PRIORITY TASKS ==================== */}
        {highPriorityTasks.length > 0 && (
          <View style={styles.taskGroup}>
            <View style={styles.groupHeader}>
              <Heading2>Urgent</Heading2>
              <Text style={styles.taskCount}>{highPriorityTasks.length}</Text>
            </View>

            {highPriorityTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onToggle={() => handleToggleTask(task.id)}
                priorityColor={Colors.error}
              />
            ))}
          </View>
        )}

        {/* ==================== MEDIUM PRIORITY TASKS ==================== */}
        {mediumPriorityTasks.length > 0 && (
          <View style={styles.taskGroup}>
            <View style={styles.groupHeader}>
              <Heading2>Medium Priority</Heading2>
              <Text style={styles.taskCount}>{mediumPriorityTasks.length}</Text>
            </View>

            {mediumPriorityTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onToggle={() => handleToggleTask(task.id)}
                priorityColor={Colors.warning}
              />
            ))}
          </View>
        )}

        {/* ==================== LOW PRIORITY TASKS ==================== */}
        {lowPriorityTasks.length > 0 && (
          <View style={styles.taskGroup}>
            <View style={styles.groupHeader}>
              <Heading2>Low Priority</Heading2>
              <Text style={styles.taskCount}>{lowPriorityTasks.length}</Text>
            </View>

            {lowPriorityTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onToggle={() => handleToggleTask(task.id)}
                priorityColor={Colors.slate[400]}
              />
            ))}
          </View>
        )}

        {/* ==================== ADD NEW TASK BUTTON ==================== */}
        <View style={styles.addButtonContainer}>
          <StyledButton
            title="Add New Task"
            onPress={() => console.log('Add task')}
            variant="primary"
            icon={<MaterialIcons name="add" size={20} color={Colors.white} />}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/**
 * Task Item Component
 * Reusable component for displaying individual tasks
 */
function TaskItem({
  task,
  onToggle,
  priorityColor,
}: {
  task: Task;
  onToggle: () => void;
  priorityColor: string;
}) {
  return (
    <StyledCard style={styles.taskCard} onPress={onToggle}>
      <View style={styles.taskCardContent}>
        <TouchableOpacity
          style={[styles.checkbox, { borderColor: priorityColor }]}
          onPress={onToggle}
          activeOpacity={0.7}
        >
          {task.completed && (
            <MaterialIcons
              name="check"
              size={16}
              color={priorityColor}
              style={styles.checkmark}
            />
          )}
        </TouchableOpacity>

        <View style={styles.taskInfo}>
          <Text
            style={[
              styles.taskTitle,
              task.completed && styles.taskTitleCompleted,
            ]}
          >
            {task.title}
          </Text>
          <View style={styles.taskMeta}>
            <MaterialIcons
              name="schedule"
              size={14}
              color={Colors.text.tertiary}
            />
            <Text style={styles.taskDate}>{task.dueDate}</Text>
            {task.category !== 'general' && (
              <StatusBadge
                label={task.category.toUpperCase()}
                variant="default"
                style={styles.categoryBadge}
              />
            )}
          </View>
        </View>

        <MaterialIcons
          name="chevron_right"
          size={24}
          color={Colors.text.tertiary}
        />
      </View>
    </StyledCard>
  );
}

// ==================== STYLES ====================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.light,
  },

  // Header Actions
  headerActions: {
    flexDirection: 'row',
    gap: Spacing[2],
    marginBottom: Spacing[1],
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.default,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.slate[200],
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.sm,
  },

  // Content
  content: {
    flex: 1,
    paddingTop: Spacing[4],
  },

  // Voice Command Card
  voiceCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  voiceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[4],
    flex: 1,
  },
  voiceIconContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.default,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  voiceTitle: {
    fontSize: Typography.sizes.base,
    fontWeight: '600',
    color: Colors.white,
    marginBottom: Spacing[1],
  },
  voiceSubtitle: {
    fontSize: Typography.sizes.xs,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  voiceButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.default,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  voiceButtonActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  voiceWaveform: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing[1],
    height: 20,
  },
  waveBars: {
    width: 2,
    backgroundColor: Colors.white,
    borderRadius: 1,
  },

  // Task Groups
  taskGroup: {
    marginHorizontal: Spacing[4],
    marginVertical: Spacing[4],
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing[3],
  },
  taskCount: {
    fontSize: Typography.sizes.sm,
    fontWeight: '600',
    color: Colors.text.secondary,
    backgroundColor: Colors.slate[100],
    paddingHorizontal: Spacing[2],
    paddingVertical: Spacing[1],
    borderRadius: BorderRadius.full,
  },

  // Task Card
  taskCard: {
    marginHorizontal: 0,
    marginVertical: Spacing[2],
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
  },
  taskCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.sm,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    marginLeft: -1,
  },
  taskInfo: {
    flex: 1,
  },
  taskTitle: {
    fontSize: Typography.sizes.base,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: Spacing[2],
  },
  taskTitleCompleted: {
    color: Colors.text.tertiary,
    textDecorationLine: 'line-through',
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
  },
  taskDate: {
    fontSize: Typography.sizes.xs,
    color: Colors.text.tertiary,
  },
  categoryBadge: {
    marginLeft: Spacing[2],
  },

  // Add Button
  addButtonContainer: {
    marginHorizontal: Spacing[4],
    marginVertical: Spacing[6],
  },
});
