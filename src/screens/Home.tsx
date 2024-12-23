import React, {useEffect, useState} from 'react';
import {View,Text,TouchableOpacity,FlatList,Alert,SafeAreaView,StatusBar,ListRenderItem,Modal,ScrollView,TextInput,Image,NativeModules,PermissionsAndroid,Platform,ToastAndroid} from 'react-native';
import {BLOCKED_NUMBERS, STAR_PROTECTION, STOP_PROTECTION} from './constant';
import {styles} from './styles';
import axios from 'axios';

import {
  BlockedNumber,
  BlockedNumberCardProps,
  NumberListItemProps,
  ActionButtonProps,
} from './type';
import RNFS from 'react-native-fs';
const BlockedNumberCard: React.FC<BlockedNumberCardProps> = ({
  count,
  todayCount,
}) => {
  const [modalVisible, setModalVisible] = useState(false);

  return (
    <View style={styles.card}>
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.cardTitle}>Call Blocker</Text>
          </View>
          <TouchableOpacity
            style={styles.helpButton}
            onPress={() => setModalVisible(true)}>
            <Text style={styles.helpButtonText}> ✅ Get Verified</Text>
          </TouchableOpacity>

        </View>
        <Text style={styles.cardSubtitle}>
          Protecting you from unwanted calls
        </Text>

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{count}</Text>
            <Text style={styles.statLabel}>Total Blocked</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{todayCount}</Text>
            <Text style={styles.statLabel}>Today</Text>
          </View>
        </View>
      </View>
      <UnblockRequestForm
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
      />
    </View>
  );
};

const getTypeColor = (type: BlockedNumber['type']): string => {
  switch (type) {
    case 'spam':
      return '#FFE4E1';
    case 'telemarketer':
      return '#E6F3FF';
    case 'scam':
      return '#FFE4E4';
    default:
      return '#F0F0F0';
  }
};

const getTypeLabel = (type: BlockedNumber['type']): string => {
  switch (type) {
    case 'spam':
      return '🚫 Spam';
    case 'telemarketer':
      return '📞 Telemarketer';
    case 'scam':
      return '⚠️ Scam';
    default:
      return '❓ Unknown';
  }
};

const NumberListItem: React.FC<NumberListItemProps> = ({item}) => (
  <View style={[styles.numberItem, {backgroundColor: getTypeColor(item.type)}]}>
    <View style={styles.numberContent}>
      <Text style={styles.numberText}>{item.number}</Text>
      <Text style={styles.callerName}>{item.caller || 'Unknown Caller'}</Text>
      <View style={styles.numberFooter}>
        <Text style={styles.typeLabel}>{getTypeLabel(item.type)}</Text>
        <Text style={styles.blockDate}>
          Blocked on {new Date(item.date).toLocaleDateString()}
        </Text>
      </View>
    </View>
  </View>
);

const ActionButton: React.FC<ActionButtonProps> = ({
  running,
  onPress,
  btnName,
}) => (
  <TouchableOpacity
    style={[styles.button, running ? styles.stopButton : styles.startButton]}
    onPress={onPress}
    activeOpacity={0.8}>
    <View style={styles.buttonContent}>
      <Text style={styles.buttonIcon}>{running ? '🛑' : '🛡️'}</Text>
      <Text style={styles.buttonText}>
        {btnName}
      </Text>
    </View>
  </TouchableOpacity>
);

const Home: React.FC = () => {
  const [serviceRunning, setServiceRunning] = useState<boolean>(false);
  const todayCount = BLOCKED_NUMBERS.filter(
    num => num.date === new Date().toISOString().split('T')[0],
  ).length;

  const {CallRecording} = NativeModules;
  const [audioAccessGranted, setAudioAccessGranted] = useState(false);

  useEffect(() => {
    requestPermission();
  }, []);

  const requestPermission = async () => {
    try {
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
      ]);

      // Check if all permissions are granted
      const allPermissionsGranted =
        granted[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] ===
          PermissionsAndroid.RESULTS.GRANTED &&
        granted[PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE] ===
          PermissionsAndroid.RESULTS.GRANTED &&
        granted[PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE] ===
          PermissionsAndroid.RESULTS.GRANTED;
      granted[PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE] ===
        PermissionsAndroid.RESULTS.GRANTED;

      setAudioAccessGranted(allPermissionsGranted);
    } catch (err) {
      setAudioAccessGranted(false);
    }
  };
  const showToastWithGravityAndOffset = (message:string) => {
    ToastAndroid.showWithGravityAndOffset(
     message,
      ToastAndroid.LONG,
      ToastAndroid.CENTER,
      25,
      50,
    );
  };


  function startCallRecording() {
    if(serviceRunning === false){
      const documentsDir = RNFS.DocumentDirectoryPath; // Internal storage

      let filePath = '';
      if (Platform.OS === 'android') {
        filePath = `${documentsDir}/callRecording.mp4`;
      }
      CallRecording.startRecording(
        filePath,
        (successMessage: any) => {
          showToastWithGravityAndOffset("Recording Started Successfully")
        },
        (errorMessage: any) => {
          console.error(errorMessage); // Error callback
        },
      );
    }
    setServiceRunning(true);
  }

  const checkAudioFile = async() =>{
    const documentsDir = RNFS.DocumentDirectoryPath; // Internal storage
      let filePath = `${documentsDir}/callRecording.mp4`;
      
      const formData = new FormData();
      formData.append('file', {
        uri: filePath,
        type: 'audio/mp4', // Change if the recorded format is different
        name: 'callRecording.mp4',
      });      
  
        try {
          const response = await axios.post('https://75f0-202-149-221-42.ngrok-free.app/upload-audio', formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          });
          Alert.alert('Upload Successful', `Server Response: ${JSON.stringify(response.data)}`);
        } catch (error) {
          console.log('Error uploading file:', error);
          //Alert.alert('Error', 'Failed to upload the audio file.');
        }
      // try {
      //   const response = await fetch('https://75f0-202-149-221-42.ngrok-free.app/upload-audio', {
      //     method: 'POST',
      //     body: formData,
      //   });
  
      //   const result = await response.json();
      //   if (response.ok) {
      //     Alert.alert('Upload Successful', `Server Response: ${JSON.stringify(result)}`);
      //   } else {
      //     Alert.alert('Upload Failed', `Error: ${result.message}`);
      //   }
      // } catch (error) {
      //   console.error('Error uploading file:', error);
      //   Alert.alert('Error', 'Failed to upload the audio file.');
      // }

      try {
        const response = await fetch('https://75f0-202-149-221-42.ngrok-free.app/', {
          method: 'GET',
        });
  
        const result = await response.json();

        if (response.ok) {
          Alert.alert('READING Successful', `Server Response: ${JSON.stringify(result)}`);
        } else {
          Alert.alert('READING Failed', `Error: ${result.message}`);
        }
      } catch (error) {
        Alert.alert('Error', 'Failed to upload the audio file.');
      }
    };  

  const getRecording = async () => {
    const documentsDir = RNFS.DocumentDirectoryPath; // Path to your file
    let filePath = `${documentsDir}/callRecording.mp4`;

    // Check if the file exists
    const fileExists = await RNFS.exists(filePath);

    if (fileExists) {
      // Read the file (use RNFS.readFile for text, or use RNFS.readFileAssets for binary data)
      try {
        const fileContents = await RNFS.readFile(filePath, 'base64'); // Reading as base64
        console.log('File Contents:', fileContents);

        // You can convert base64 back to a file or manipulate it here
      } catch (err) {
        console.error('Error reading file:', err);
      }
    } else {
      console.log('File does not exist at the specified path.');
    }
  };

  // Stop Recording
  function stopCallRecording() {
    if(serviceRunning){
      CallRecording.stopRecording(
        (successMessage: any) => {
          showToastWithGravityAndOffset("Recording stoped Successfully")
          Alert.alert("This audio Successfully")
        },
        (errorMessage: any) => {
          console.error(errorMessage); // Error callback
        },
      );
    }
    // checkAudioFile();
    setServiceRunning(false);
  }

  const renderItem: ListRenderItem<BlockedNumber> = ({item}) => (
    <NumberListItem item={item} />
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />

      <BlockedNumberCard
        count={BLOCKED_NUMBERS.length}
        todayCount={todayCount}
      />

      <View style={styles.listContainer}>
        <Text style={styles.listHeader}>Blocked Call History</Text>
        <FlatList
          data={BLOCKED_NUMBERS}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />
      </View>

      <View style={styles.buttonContainer}>
        {!serviceRunning ? (
          <ActionButton
            btnName={STAR_PROTECTION}
            running={serviceRunning}
            onPress={startCallRecording}
          />
        ) : (
          <ActionButton
            btnName={STOP_PROTECTION}
            running={serviceRunning}
            onPress={stopCallRecording}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

interface FormModalProps {
  visible: boolean;
  onClose: () => void;
}

interface UnblockRequest {
  phoneNumber: string;
  callerName: string;
  reason: string;
  photo?: string;
  document?: string;
}
const UnblockRequestForm: React.FC<FormModalProps> = ({visible, onClose}) => {
  const [formData, setFormData] = useState<UnblockRequest>({
    phoneNumber: '',
    callerName: '',
    reason: '',
  });
  const [photo, setPhoto] = useState<string>('');
  const [document, setDocument] = useState<string>('');

  const handleImagePick = async (type: 'photo' | 'document') => {
  };

  const handleSubmit = () => {
    // Here you would typically send the data to your backend
    Alert.alert(
      'Request Submitted',
      'Your unblock request has been submitted successfully. We will review it shortly.',
      [{text: 'OK', onPress: onClose}],
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}> Get Verification Badge</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter phone number"
                value={formData.phoneNumber}
                onChangeText={text =>
                  setFormData({...formData, phoneNumber: text})
                }
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your name"
                value={formData.callerName}
                onChangeText={text =>
                  setFormData({...formData, callerName: text})
                }
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Message</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Type message"
                value={formData.reason}
                onChangeText={text => setFormData({...formData, reason: text})}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Your Photo</Text>
              <TouchableOpacity
                style={styles.uploadButton}
                onPress={() => handleImagePick('photo')}>
                <Text style={styles.uploadButtonText}>
                  {photo ? 'Change Photo' : 'Upload Photo'}
                </Text>
              </TouchableOpacity>
              {photo && (
                <Image source={{uri: photo}} style={styles.previewImage} />
              )}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Identity Document</Text>
              <TouchableOpacity
                style={styles.uploadButton}
                onPress={() => handleImagePick('document')}>
                <Text style={styles.uploadButtonText}>
                  {document ? 'Change Document' : 'Upload Document'}
                </Text>
              </TouchableOpacity>
              {document && (
                <Image source={{uri: document}} style={styles.previewImage} />
              )}
            </View>

            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleSubmit}>
              <Text style={styles.submitButtonText}>Submit Request</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};
export default Home;
