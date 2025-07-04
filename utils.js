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

function cleanYouTubeURL(url) {
  try {
    const urlObj = new URL(url);
    const videoId = urlObj.searchParams.get('v') || url.match(/youtu\.be\/([0-9A-Za-z_-]{11})/)?.[1];
    if (videoId) {
      return `https://www.youtube.com/watch?v=${videoId}`;
    }
    return url;
  } catch (err) {
    console.warn(`Invalid URL format: ${url}, returning original`);
    return url;
  }
}

function validateYouTubeURL(url) {
  return ytdl.validateURL(url) ? url : null;
}

function extractYouTubeID(url) {
  const cleanedUrl = cleanYouTubeURL(url);
  if (!validateYouTubeURL(cleanedUrl)) return '';
  const match = cleanedUrl.match(/(?:v=|\/)([0-9A-Za-z_-]{11})/) || cleanedUrl.match(/youtu\.be\/([0-9A-Za-z_-]{11})/);
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

async function getStream(url, retries = 3, delay = 10000) {
  const cleanedUrl = cleanYouTubeURL(url);
  console.log(`Getting stream for cleaned URL: ${cleanedUrl}, attempt ${4 - retries}`);
  for (let i = 0; i < retries; i++) {
    try {
      if (validateYouTubeURL(cleanedUrl)) {
        // Set YouTube API key for play-dl if available
        if (process.env.YOUTUBE_API_KEY) {
          await play.setToken({ youtube: { key: process.env.YOUTUBE_API_KEY } });
        }
        // Try play-dl first
        try {
          console.log('Attempting to get stream with play-dl');
          const streamInfo = await play.stream(cleanedUrl, { source: 'yt', timeout: 15000 });
          console.log('Stream obtained from play-dl');
          return streamInfo.stream;
        } catch (playDlError) {
          console.warn(`play-dl failed: ${playDlError.message}`);
          console.log('Falling back to ytdl-core');
          try {
            const stream = ytdl(cleanedUrl, {
              filter: 'audioonly',
              quality: 'highestaudio',
              highWaterMark: 1 << 25,
              requestOptions: {
                headers: {
                  'User-Agent': i % 2 === 0
                    ? 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                    : 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Safari/605.1.15',
                },
                ...(process.env.YOUTUBE_API_KEY && { apiKey: process.env.YOUTUBE_API_KEY }),
              },
            });
            stream.on('error', (err) => console.error(`Stream error for ${cleanedUrl}: ${err.message}`));
            console.log('Stream obtained from ytdl-core');
            return stream;
          } catch (ytdlError) {
            console.error(`ytdl-core failed: ${ytdlError.message}`);
            if (i < retries - 1) {
              console.log(`Retrying after ${delay}ms...`);
              await new Promise((resolve) => setTimeout(resolve, delay));
              continue;
            }
            throw new Error(`Failed to get YouTube stream: ${ytdlError.message}`);
          }
        }
      } else {
        // Non-YouTube URLs
        try {
          console.log('Attempting to get stream with play-dl for non-YouTube URL');
          const streamInfo = await play.stream(cleanedUrl, {
            source: cleanedUrl.includes('soundcloud.com') ? 'so' : 'yt',
            timeout: 15000,
          });
          console.log('Stream obtained from play-dl');
          return streamInfo.stream;
        } catch (playDlError) {
          console.error(`play-dl failed for non-YouTube URL: ${playDlError.message}`);
          if (i < retries - 1) {
            console.log(`Retrying after ${delay}ms...`);
            await new Promise((resolve) => setTimeout(resolve, delay));
            continue;
          }
          throw new Error(`Failed to get stream: ${playDlError.message}`);
        }
      }
    } catch (error) {
      console.error(`Attempt ${i + 1} failed: ${error.message}`);
      if (i === retries - 1) {
        throw new Error(`Stream retrieval failed after ${retries} attempts: ${error.message}`);
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
  cleanYouTubeURL,
};