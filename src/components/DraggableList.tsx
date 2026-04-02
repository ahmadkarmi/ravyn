// DraggableList — Pure PanResponder + Animated drag-to-reorder
// No worklets, no react-native-reanimated: fully compatible with Expo Go

import React, { useRef, useState, useCallback } from 'react';
import { View, PanResponder, Animated, StyleSheet } from 'react-native';

export interface DragParams<T> {
    item: T;
    index: number;
    drag: () => void;
    isActive: boolean;
}

interface DraggableListProps<T> {
    data: T[];
    keyExtractor: (item: T) => string;
    renderItem: (params: DragParams<T>) => React.ReactNode;
    onDragEnd: (reordered: T[]) => void;
    scrollEnabled?: boolean;
    activationDistance?: number;
}

interface ItemLayout {
    y: number;
    height: number;
}

export default function DraggableList<T>({
    data,
    keyExtractor,
    renderItem,
    onDragEnd,
}: DraggableListProps<T>) {
    const [activeIndex, setActiveIndex] = useState<number | null>(null);

    const activeIndexRef = useRef<number | null>(null);
    const itemLayouts = useRef<ItemLayout[]>([]);
    const dragY = useRef(new Animated.Value(0)).current;
    const dragScale = useRef(new Animated.Value(1)).current;
    const dataRef = useRef(data);
    dataRef.current = data;

    const getDropIndex = useCallback((dy: number): number => {
        const idx = activeIndexRef.current;
        if (idx === null) return 0;

        const layout = itemLayouts.current[idx];
        if (!layout) return idx;

        const dragCenter = layout.y + layout.height / 2 + dy;
        const n = dataRef.current.length;

        for (let i = 0; i < n; i++) {
            const l = itemLayouts.current[i];
            if (!l) continue;
            if (dragCenter < l.y + l.height / 2) return i;
        }
        return n - 1;
    }, []);

    const panResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: () => activeIndexRef.current !== null,
            onMoveShouldSetPanResponderCapture: () => activeIndexRef.current !== null,
            onPanResponderMove: (_, { dy }) => {
                dragY.setValue(dy);
            },
            onPanResponderRelease: (_, { dy }) => {
                const fromIdx = activeIndexRef.current;
                const toIdx = getDropIndex(dy);

                dragY.setValue(0);
                activeIndexRef.current = null;
                setActiveIndex(null);
                Animated.spring(dragScale, { toValue: 1, damping: 14, stiffness: 300, useNativeDriver: true }).start();

                if (fromIdx !== null && fromIdx !== toIdx) {
                    const next = [...dataRef.current];
                    const [moved] = next.splice(fromIdx, 1);
                    next.splice(toIdx, 0, moved);
                    onDragEnd(next);
                }
            },
            onPanResponderTerminate: () => {
                dragY.setValue(0);
                activeIndexRef.current = null;
                setActiveIndex(null);
                Animated.spring(dragScale, { toValue: 1, damping: 14, stiffness: 300, useNativeDriver: true }).start();
            },
        })
    ).current;

    const startDrag = useCallback(
        (index: number) => {
            dragY.setValue(0);
            activeIndexRef.current = index;
            setActiveIndex(index);
            Animated.spring(dragScale, {
                toValue: 1.03,
                damping: 12,
                stiffness: 300,
                useNativeDriver: true,
            }).start();
        },
        [dragY, dragScale]
    );

    return (
        <View {...panResponder.panHandlers}>
            {data.map((item, index) => {
                const key = keyExtractor(item);
                const isActive = index === activeIndex;

                return (
                    <View
                        key={key}
                        onLayout={(e) => {
                            itemLayouts.current[index] = {
                                y: e.nativeEvent.layout.y,
                                height: e.nativeEvent.layout.height,
                            };
                        }}
                    >
                        <Animated.View
                            style={
                                isActive
                                    ? [
                                          styles.activeItem,
                                          {
                                              transform: [
                                                  { translateY: dragY },
                                                  { scale: dragScale },
                                              ],
                                          },
                                      ]
                                    : undefined
                            }
                        >
                            {renderItem({ item, index, drag: () => startDrag(index), isActive })}
                        </Animated.View>
                    </View>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    activeItem: {
        zIndex: 999,
        elevation: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.18,
        shadowRadius: 12,
        opacity: 0.96,
    },
});
