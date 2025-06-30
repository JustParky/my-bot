const ytdl = require('@distube/ytdl-core');
const { joinVoiceChannel, getVoiceConnection, createAudioResource, StreamType } = require('@discordjs/voice');
const play = require('play-dl');

class ServerQueue {
  constructor(connection, channel) {
    this.connection = connection;
    this.channel = channel;
    this.songs = [];
    this.playing = false;
    this.loop = false;
    this.volume = 0.5;
    this.skipVotes = new Set();
    this.lastPlayed = null;
    this.currentSong = null;
    this.controllerMessage = null;
  }
}

function splitMessage(content, maxLength = 2000) {
  const chunks = [];
  while (content.length > 0) {
    if (content.length <= maxLength) {
      chunks.push(content);
      break;
    }
    let splitIndex = content.lastIndexOf('\n', maxLength) || content.lastIndexOf(' ', maxLength) || maxLength;
    chunks.push(content.substring(0, splitIndex));
    content = content.substring(splitIndex).trim();
  }
  return chunks;
}

function firstResultOrFail(arr, what) {
  if (!Array.isArray(arr) || arr.length === 0) throw new Error(`No ${what} results found 😢`);
  return arr[0];
}

function validateYouTubeURL(url) {
  return ytdl.validateURL(url) ? url : null;
}

function extractYouTubeID(url) {
  if (!validateYouTubeURL(url)) return '';
  const match = url.match(/(?:v=|\/)([0-9A-Za-z_-]{11})/) || url.match(/youtu\.be\/([0-9A-Za-z_-]{11})/);
  return match ? match[1] : '';
}

async function getOrJoinVoiceChannel(member, guildId, adapterCreator) {
  console.log(`Attempting to join voice channel for guild: ${guildId}`);
  const existing = getVoiceConnection(guildId);
  if (existing) {
    if (existing.joinConfig.channelId === member.voice.channel?.id) return existing;
    throw new Error('Bot is already in another voice channel.');
  }
  if (!member.voice.channel) throw new Error('You must be in a voice channel!');
  const connection = joinVoiceChannel({
    channelId: member.voice.channel.id,
    guildId,
    adapterCreator,
  });
  console.log(`Joined voice channel: ${member.voice.channel.id}`);
  return connection;
}

async function getStream(url) {
  console.log(`Getting stream for URL: ${url}`);
  if (validateYouTubeURL(url)) {
    try {
      const stream = ytdl(url, { filter: 'audioonly', quality: 'highestaudio', highWaterMark: 1 << 25 });
      console.log('Stream obtained from ytdl-core');
      return stream;
    } catch (ytdlError) {
      console.warn('ytdl-core failed, trying play-dl:', ytdlError.message);
      try {
        const stream = await play.stream(url, { source: 'yt', timeout: 5000 });
        console.log('Stream obtained from play-dl');
        return stream.stream;
      } catch (e) {
        console.error('play-dl failed:', e.message);
        throw new Error('Failed to get stream');
      }
    }
  } else {
    try {
      const stream = await play.stream(url, { source: url.includes('soundcloud.com') ? 'so' : 'yt', timeout: 5000 });
      console.log('Stream obtained from play-dl');
      return stream.stream;
    } catch (e) {
      console.warn('play-dl failed, using ytdl-core:', e.message);
      try {
        const stream = ytdl(url, { filter: 'audioonly', quality: 'highestaudio', highWaterMark: 1 << 25 });
        console.log('Stream obtained from ytdl-core');
        return stream;
      } catch (ytdlError) {
        console.error('ytdl-core failed:', ytdlError.message);
        throw new Error('Failed to get stream');
      }
    }
  }
}

module.exports = {
  ServerQueue,
  splitMessage,
  firstResultOrFail,
  validateYouTubeURL,
  extractYouTubeID,
  getOrJoinVoiceChannel,
  getStream,
};