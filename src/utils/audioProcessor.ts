/**
 * Audio processing utility for RuralCare clinical dictation.
 * Resamples recorded audio to 16kHz mono (16-bit PCM), the universal standard
 * for Whisper.cpp (WASM) and offline speech engines.
 */

export interface ResampledAudio {
  wavBlob: Blob;
  pcm16: Int16Array;
  sampleRate: number;
  durationSecs: number;
}

/**
 * Resamples an audio Blob from MediaRecorder to 16,000 Hz 1-channel mono PCM
 * using browser native OfflineAudioContext.
 */
export async function resampleTo16kHzMono(audioBlob: Blob): Promise<ResampledAudio> {
  const arrayBuffer = await audioBlob.arrayBuffer();
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const audioContext = new AudioCtx();

  // Decode the compressed browser recording (WebM / Ogg / MP4)
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

  const targetSampleRate = 16000;
  const targetDuration = audioBuffer.duration;
  const targetLength = Math.ceil(targetDuration * targetSampleRate);

  // Render to 16kHz mono via OfflineAudioContext
  const offlineContext = new OfflineAudioContext(1, targetLength, targetSampleRate);
  const source = offlineContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(offlineContext.destination);
  source.start(0);

  const renderedBuffer = await offlineContext.startRendering();
  await audioContext.close();

  // Extract single-channel float samples
  const channelData = renderedBuffer.getChannelData(0);

  // Convert Float32 (-1.0 to 1.0) to 16-bit signed PCM integers (-32768 to 32767)
  const pcm16 = new Int16Array(channelData.length);
  for (let i = 0; i < channelData.length; i++) {
    const s = Math.max(-1, Math.min(1, channelData[i]));
    pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }

  // Generate standard 16kHz mono RIFF WAV header
  const wavBlob = encodeWAV(pcm16, targetSampleRate);

  return {
    wavBlob,
    pcm16,
    sampleRate: targetSampleRate,
    durationSecs: targetDuration,
  };
}

/**
 * Encodes 16-bit PCM buffer into standard WAV container
 */
function encodeWAV(samples: Int16Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  // RIFF identifier
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(view, 8, 'WAVE');

  // fmt subchunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);          // SubChunk1Size (16 for PCM)
  view.setUint16(20, 1, true);           // AudioFormat (1 = PCM)
  view.setUint16(22, 1, true);           // NumChannels (1 = mono)
  view.setUint32(24, sampleRate, true);  // SampleRate (16000)
  view.setUint32(28, sampleRate * 2, true); // ByteRate (SampleRate * NumChannels * BitsPerSample/8)
  view.setUint16(32, 2, true);           // BlockAlign (NumChannels * BitsPerSample/8)
  view.setUint16(34, 16, true);          // BitsPerSample (16)

  // data subchunk
  writeString(view, 36, 'data');
  view.setUint32(40, samples.length * 2, true);

  // Write PCM samples
  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    view.setInt16(offset, samples[i], true);
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string): void {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}
