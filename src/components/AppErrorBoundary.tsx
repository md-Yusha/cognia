import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

type Props = { children: React.ReactNode };

type State = { error: string | null };

export class AppErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error: error.message || 'Something went wrong' };
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <View style={{ flex: 1, backgroundColor: '#FAF7F2', justifyContent: 'center', padding: 28 }}>
        <Text style={{ fontFamily: 'PatrickHand', fontSize: 36, color: '#2B3A30' }}>The screen stumbled</Text>
        <Text style={{ fontFamily: 'Nunito-SemiBold', fontSize: 18, color: '#597362', marginTop: 10 }}>{this.state.error}</Text>
        <TouchableOpacity
          onPress={() => this.setState({ error: null })}
          style={{ marginTop: 22, backgroundColor: '#3D6C4E', borderRadius: 999, minHeight: 56, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={{ color: 'white', fontFamily: 'Nunito-Bold', fontSize: 18 }}>Show the app again</Text>
        </TouchableOpacity>
      </View>
    );
  }
}
