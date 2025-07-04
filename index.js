/* eslint-disable no-console, no-unused-vars */
require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField, ActivityType } = require('discord.js');
const { createAudioPlayer, AudioPlayerStatus } = require('@discordjs/voice');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const Genius = require('genius-lyrics');
const { playNext } = require('./playnext');
const { ServerQueue, splitMessage, firstResultOrFail, validateYouTubeURL, extractYouTubeID, getOrJoinVoiceChannel, getStream } = require('./utils');

// Environment variable validation
const requiredEnvVars = ['DISCORD_TOKEN', 'GUILD_ID', 'WELCOME_CHANNEL_ID', 'CLIENT_ID'];
requiredEnvVars.forEach((varName) => {
  if (!process.env[varName]) console.warn(`⚠️ Missing ${varName} in .env`);
});

// Audio directory setup
const isWindows = process.platform === 'win32';
const audioDir = isWindows ? path.join(__dirname, 'audio') : '/home/container/audio';
const RADIO_STATIONS = fs.existsSync(audioDir)
  ? fs.readdirSync(audioDir)
      .filter((f) => f.endsWith('.mp3') || f.endsWith('.wav'))
      .reduce((acc, file) => ({
        ...acc,
        [file.split('.')[0].toLowerCase()]: path.join(audioDir, file),
      }), {})
  : {};
console.log(`Audio directory: ${audioDir}, Files: ${Object.keys(RADIO_STATIONS).join(', ') || 'none'}`);

// Funny idle activities
const funnyActivities = [
  'Having a cheeky one 🍺',
  'Hacking Enclave terminals 💻',
  'Waiting for a song 🎤',
  'Eating Dominos Pizza 🍕',
  'Searching for bottlecaps 💰',
  'Avoiding Super Mutants 🧟',
  'Tuning my radio waves 📻',
  'Data mining for goodies ⛏️'
];

// Spotify token refresh mechanism
async function refreshSpotifyToken() {
  if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET || !process.env.SPOTIFY_REFRESH_TOKEN) {
    console.warn('⚠️ Missing Spotify credentials, skipping token refresh');
    return false;
  }
  try {
    const play = require('play-dl');
    await play.setToken({
      spotify: {
        client_id: process.env.SPOTIFY_CLIENT_ID,
        client_secret: process.env.SPOTIFY_CLIENT_SECRET,
        refresh_token: process.env.SPOTIFY_REFRESH_TOKEN,
        market: 'US',
      },
    });
    await play.refreshToken();
    console.log('✅ Spotify token refreshed');
    return true;
  } catch (err) {
    console.error('❌ Spotify token refresh failed:', err.message);
    return false;
  }
}
refreshSpotifyToken();
setInterval(refreshSpotifyToken, 30 * 60 * 1000);

// Client setup
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

// Attach music controls and funny activities to client for access in playNext
client.funnyActivities = funnyActivities;
client.musicControlsRow1 = new ActionRowBuilder().addComponents(
  new ButtonBuilder().setCustomId('shuffle').setLabel('🔀').setStyle(ButtonStyle.Secondary),
  new ButtonBuilder().setCustomId('previous').setLabel('⏮').setStyle(ButtonStyle.Secondary),
  new ButtonBuilder().setCustomId('pause').setLabel('⏯').setStyle(ButtonStyle.Secondary),
  new ButtonBuilder().setCustomId('skip').setLabel('⏭').setStyle(ButtonStyle.Secondary),
  new ButtonBuilder().setCustomId('loop').setLabel('🔁').setStyle(ButtonStyle.Secondary),
);
client.musicControlsRow2 = new ActionRowBuilder().addComponents(
  new ButtonBuilder().setCustomId('mute').setLabel('🔇').setStyle(ButtonStyle.Secondary),
  new ButtonBuilder().setCustomId('vol_down').setLabel('🔉').setStyle(ButtonStyle.Secondary),
  new ButtonBuilder().setCustomId('stop').setLabel('⏹️').setStyle(ButtonStyle.Danger),
  new ButtonBuilder().setCustomId('vol_up').setLabel('🔊').setStyle(ButtonStyle.Secondary),
  new ButtonBuilder().setCustomId('grab').setLabel('✉️').setStyle(ButtonStyle.Secondary),
);
client.musicControlsRow3 = new ActionRowBuilder().addComponents(
  new ButtonBuilder().setCustomId('clear_queue').setLabel('🗑️ Clear').setStyle(ButtonStyle.Secondary),
  new ButtonBuilder().setCustomId('vote_skip').setLabel('🗳️ Skip!').setStyle(ButtonStyle.Success),
  new ButtonBuilder().setCustomId('queue').setLabel('📜 Queue').setStyle(ButtonStyle.Secondary),
);
client.disabledMusicControlsRow1 = new ActionRowBuilder().addComponents(
  new ButtonBuilder().setCustomId('shuffle').setLabel('🔀').setStyle(ButtonStyle.Secondary).setDisabled(true),
  new ButtonBuilder().setCustomId('previous').setLabel('⏮').setStyle(ButtonStyle.Secondary).setDisabled(true),
  new ButtonBuilder().setCustomId('pause').setLabel('⏯').setStyle(ButtonStyle.Secondary).setDisabled(true),
  new ButtonBuilder().setCustomId('skip').setLabel('⏭').setStyle(ButtonStyle.Secondary).setDisabled(true),
  new ButtonBuilder().setCustomId('loop').setLabel('🔁').setStyle(ButtonStyle.Secondary).setDisabled(true),
);
client.disabledMusicControlsRow2 = new ActionRowBuilder().addComponents(
  new ButtonBuilder().setCustomId('mute').setLabel('🔇').setStyle(ButtonStyle.Secondary).setDisabled(true),
  new ButtonBuilder().setCustomId('vol_down').setLabel('🔉').setStyle(ButtonStyle.Secondary).setDisabled(true),
  new ButtonBuilder().setCustomId('stop').setLabel('⏹️').setStyle(ButtonStyle.Danger).setDisabled(true),
  new ButtonBuilder().setCustomId('vol_up').setLabel('🔊').setStyle(ButtonStyle.Secondary).setDisabled(true),
  new ButtonBuilder().setCustomId('grab').setLabel('✉️').setStyle(ButtonStyle.Secondary).setDisabled(true),
);
client.disabledMusicControlsRow3 = new ActionRowBuilder().addComponents(
  new ButtonBuilder().setCustomId('clear_queue').setLabel('🗑️ Clear').setStyle(ButtonStyle.Secondary).setDisabled(true),
  new ButtonBuilder().setCustomId('vote_skip').setLabel('🗳️ Skip!').setStyle(ButtonStyle.Success).setDisabled(true),
  new ButtonBuilder().setCustomId('queue').setLabel('📜 Queue').setStyle(ButtonStyle.Secondary).setDisabled(true),
);
client.historyButtons = new ActionRowBuilder().addComponents(
  new ButtonBuilder().setCustomId('replay').setLabel('▶️ Replay').setStyle(ButtonStyle.Primary),
);

const player = createAudioPlayer();
const queues = new Map();
const apiCache = new Map();
const history = new Map();
const genius = process.env.GENIUS_API_KEY ? new Genius.Client(process.env.GENIUS_API_KEY) : null;
const handledInteractions = new Set();

// AudioPlayer event handlers
player.on('error', async (error) => {
  console.error(`AudioPlayer error for guild ${queues.keys().next().value}: ${error.message}`);
  const guildId = [...queues.keys()].find(gid => queues.get(gid).connection?.state?.subscription?.player === player);
  if (guildId) {
    const serverQueue = queues.get(guildId);
    try {
      await serverQueue.channel.send(`❌ Error playing song: ${error.message}. Skipping to next song...`);
      await playNext(guildId, serverQueue.channel, client, player, queues, history);
    } catch (err) {
      console.error(`Failed to handle AudioPlayer error for guild ${guildId}: ${err.message}`);
    }
  }
});

player.on(AudioPlayerStatus.Idle, async () => {
  const guildId = [...queues.keys()].find(gid => queues.get(gid).connection?.state?.subscription?.player === player);
  if (!guildId) {
    console.warn('No guild found for idle AudioPlayer');
    return;
  }

  const serverQueue = queues.get(guidId);
  if (!serverQueue) {
    console.warn(`No server queue found for guild: ${guildId}`);
    return;
  }

  if (serverQueue.loop && serverQueue.currentSong) {
    console.log(`Loop enabled, replaying: ${serverQueue.currentSong.title}`);
    serverQueue.songs.unshift({ ...serverQueue.currentSong, stream: await getStream(serverQueue.currentSong.url) });
    await playNext(guildId, serverQueue.channel, client, player, queues, history);
  } else if (serverQueue.songs.length > 0) {
    console.log(`Queue has ${serverQueue.songs.length} songs, playing next`);
    await playNext(guildId, serverQueue.channel, client, player, queues, history);
  } else {
    console.log(`Queue empty for guild ${guildId}, stopping playback`);
    serverQueue.playing = false;
    const embed = new EmbedBuilder()
      .setTitle('Nexus Control Panel')
      .setDescription('No song is currently playing.\nJoin a voice channel and queue songs by name or url using /play.')
      .setColor(0x1db954)
      .setImage('https://i.postimg.cc/y17C26Nd/Chat-GPT-Image-Jul-1-2025-10-41-35-PM.png')
      .setTimestamp();
    if (serverQueue.controllerMessage) {
      try {
        if (!serverQueue.controllerMessage.deleted && serverQueue.controllerMessage.deletable) {
          await serverQueue.controllerMessage.delete();
          serverQueue.controllerMessage = null; // Reset after deletion
        }
      } catch (err) {
        console.error(`Failed to delete controller message for guild ${guildId}: ${err.message}`);
      }
    }
    try {
      serverQueue.controllerMessage = await serverQueue.channel.send({
        embeds: [embed],
        components: [client.disabledMusicControlsRow1, client.disabledMusicControlsRow2, client.disabledMusicControlsRow3],
      });
      setTimeout(async () => {
        if (queues.has(guildId) && !queues.get(guildId).songs.length && !queues.get(guildId).playing) {
          serverQueue.connection.destroy();
          queues.delete(guildId);
          await serverQueue.channel.send('👋 Nexus has left the voice channel.');
        }
      }, 5 * 60 * 1000); // 5 minutes
    } catch (err) {
      console.error(`Failed to send idle message for guild ${guildId}: ${err.message}`);
    }
  }
});

// Xbox API retry request
async function retryRequest(url, options, retries = 3, backoff = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      const cacheKey = `${url}:${JSON.stringify(options)}`;
      if (apiCache.has(cacheKey)) {
        const cached = apiCache.get(cacheKey);
        if (Date.now() - cached.timestamp < 5 * 60 * 1000) return cached.data;
      }
      const response = await axios(url, options);
      apiCache.set(cacheKey, { data: response, timestamp: Date.now() });
      return response;
    } catch (error) {
      if (error.response?.status === 429 && i < retries - 1) {
        console.warn(`Rate limit hit, retrying after ${backoff}ms`);
        await new Promise((resolve) => setTimeout(resolve, backoff));
        backoff *= 2;
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retries reached');
}

// Error handling middleware
async function executeCommand(interaction, callback) {
  try {
    if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.SendMessages)) {
      throw new Error('Bot lacks Send Messages permission');
    }
    await callback(interaction);
  } catch (error) {
    console.error(`Command ${interaction.commandName || interaction.customId} failed: ${error.message}`);
    if (interaction.isRepliable()) {
      const replyFn = interaction.deferred || interaction.replied ? interaction.editReply : interaction.reply;
      await replyFn({ content: `❌ Error: ${error.message}`, ephemeral: true }).catch((err) => {
        console.error('Failed to send error reply:', err.message);
      });
    } else {
      console.warn('Interaction is not repliable:', interaction.customId || interaction.commandName);
    }
  }
}

// Button interaction handler
async function handleMusicButtonInteraction(interaction) {
  const interactionId = interaction.token;
  if (handledInteractions.has(interactionId)) {
    console.warn(`Duplicate interaction detected: ${interactionId}, skipping`);
    return;
  }
  handledInteractions.add(interactionId);

  try {
    console.time(`handleMusicButtonInteraction_${interactionId}`);
    console.log(`Handling button interaction: ${interaction.customId} for guild ${interaction.guildId}`);

    await interaction.deferReply({ ephemeral: true });

    const guildId = interaction.guildId;
    const serverQueue = queues.get(guildId);
    if (!serverQueue) {
      console.warn(`No music queue found for guild: ${guildId}`);
      await interaction.editReply({ content: '❌ No music is currently playing.', ephemeral: true });
      return;
    }
    if (!interaction.member.voice.channel) {
      await interaction.editReply({ content: '❌ You must be in a voice channel to interact with the player.', ephemeral: true });
      return;
    }
    if (interaction.customId !== 'vote_skip' && interaction.customId !== 'grab' && interaction.user.id !== serverQueue.currentSong?.requestedBy && !interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
      await interaction.editReply({ content: '❌ You cannot control this song.', ephemeral: true });
      return;
    }

    if (interaction.customId === 'grab') {
      if (!serverQueue.currentSong) {
        await interaction.editReply({ content: '❌ No song is currently playing.', ephemeral: true });
        return;
      }
      const song = serverQueue.currentSong;
      const duration = song.duration ? `${Math.floor(song.duration / 60)}:${(song.duration % 60).toString().padStart(2, '0')}` : 'Unknown';
      const embed = new EmbedBuilder()
        .setTitle('📋 Grabbed Song')
        .setDescription(`**${song.title}**`)
        .addFields(
          { name: 'Artist', value: song.artist || 'Unknown Artist', inline: true },
          { name: 'Duration', value: duration, inline: true },
          { name: 'URL', value: `[Link](${song.url})`, inline: true },
          { name: 'Requested by', value: song.requestedBy || 'Unknown', inline: true }
        )
        .setColor(0x1db954)
        .setImage(song.source === 'youtube' ? `https://img.youtube.com/vi/${extractYouTubeID(song.url)}/hqdefault.jpg` : null)
        .setTimestamp();
      try {
        await interaction.user.send({ embeds: [embed] });
        await interaction.editReply({ content: '📋 Song details sent to your DMs!', ephemeral: true });
      } catch (dmError) {
        console.warn(`Failed to send DM to ${interaction.user.id}:`, dmError.message);
        await interaction.editReply({
          content: '⚠️ Could not send DM (please enable DMs from server members). Displaying song details here instead:',
          embeds: [embed],
          ephemeral: true
        });
      }
    } else if (interaction.customId === 'mute') {
      if (!serverQueue.isMuted) {
        serverQueue.previousVolume = serverQueue.volume;
        serverQueue.volume = 0;
        serverQueue.isMuted = true;
        player.state.resource?.volume?.setVolume(serverQueue.volume);
        await interaction.editReply({ content: `🔇 Volume muted (0%)`, ephemeral: true });
      } else {
        serverQueue.volume = serverQueue.previousVolume || 1.0;
        serverQueue.isMuted = false;
        player.state.resource?.volume?.setVolume(serverQueue.volume);
        await interaction.editReply({ content: `🔊 Volume unmuted to ${Math.round(serverQueue.volume * 100)}%`, ephemeral: true });
      }
    } else if (interaction.customId === 'pause') {
      if (player.state.status === AudioPlayerStatus.Playing) {
        player.pause();
        await interaction.editReply({ content: '⏸ Paused', ephemeral: true });
      } else {
        player.unpause();
        await interaction.editReply({ content: '▶️ Resumed', ephemeral: true });
      }
    } else if (interaction.customId === 'skip') {
      serverQueue.skipVotes.clear();
      player.stop();
      await interaction.editReply({ content: '⏭ Skipped the current song.', ephemeral: true });
    } else if (interaction.customId === 'previous') {
      const guildHistory = history.get(guildId) || [];
      if (!guildHistory.length) {
        await interaction.editReply({ content: '❌ No previous songs in history.', ephemeral: true });
        return;
      }
      const previousSong = guildHistory[0];
      serverQueue.songs.unshift({ ...previousSong, stream: await getStream(previousSong.url) });
      player.stop();
      await interaction.editReply({ content: `⏮ Replaying previous song: **${previousSong.title}**`, ephemeral: true });
    } else if (interaction.customId === 'vote_skip') {
      const voiceChannel = interaction.member.voice.channel;
      const memberCount = voiceChannel.members.filter((m) => !m.user.bot).size;
      const requiredVotes = Math.ceil(memberCount / 2);
      if (serverQueue.skipVotes.has(interaction.user.id)) {
        await interaction.editReply({ content: '❌ You already voted to skip.', ephemeral: true });
        return;
      }
      serverQueue.skipVotes.add(interaction.user.id);
      const currentVotes = serverQueue.skipVotes.size;
      await interaction.editReply({
        content: `🗳️ ${interaction.user.username} voted to skip! (${currentVotes}/${requiredVotes})`,
        ephemeral: true
      });
      if (serverQueue.currentSong && currentVotes >= requiredVotes) {
        serverQueue.skipVotes.clear();
        player.stop();
        await interaction.channel.send('🛑 Song skipped! This is Democracy Manifest!');
      }
    } else if (interaction.customId === 'vol_up') {
      serverQueue.volume = Math.min(serverQueue.volume + 0.25, 2.0);
      serverQueue.isMuted = false;
      player.state.resource?.volume?.setVolume(serverQueue.volume);
      await interaction.editReply({ content: `🔊 Volume increased to ${Math.round(serverQueue.volume * 100)}%`, ephemeral: true });
    } else if (interaction.customId === 'vol_down') {
      serverQueue.volume = Math.max(serverQueue.volume - 0.25, 0.1);
      serverQueue.isMuted = false;
      player.state.resource?.volume?.setVolume(serverQueue.volume);
      await interaction.editReply({ content: `🔉 Volume decreased to ${Math.round(serverQueue.volume * 100)}%`, ephemeral: true });
    } else if (interaction.customId === 'stop') {
      serverQueue.connection.destroy();
      queues.delete(guildId);
      player.stop();
      const randomActivity = funnyActivities[Math.floor(Math.random() * funnyActivities.length)];
      client.user.setActivity(randomActivity, { type: ActivityType.Custom });
      await interaction.editReply({ content: '🛑 Stopped.', ephemeral: true });
    } else if (interaction.customId === 'queue') {
      const q = serverQueue.songs;
      if (!q.length) {
        await interaction.editReply({ content: '🤖 Queue is empty! Add another banger if you want to hear more.', ephemeral: true });
        return;
      }
      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('select_song')
        .setPlaceholder('🎵 Select a song to jump to')
        .addOptions(q.slice(0, 25).map((s, idx) => ({
          label: s.title.slice(0, 100),
          description: `Requested by ${s.requestedBy}`,
          value: String(idx),
        })));
      const row = new ActionRowBuilder().addComponents(selectMenu);
      await interaction.editReply({ content: '📃 **Select a song from the queue:**', components: [row], ephemeral: true });
    } else if (interaction.customId === 'loop') {
      serverQueue.loop = !serverQueue.loop;
      console.log(`Loop state changed to: ${serverQueue.loop}`);
      const replyContent = serverQueue.loop ? '🔁 Loop mode **enabled**' : '⏹️ Loop mode **disabled**';
      await interaction.editReply({ content: replyContent, ephemeral: true });
    } else if (interaction.customId === 'shuffle') {
      if (serverQueue.songs.length < 2) {
        await interaction.editReply({ content: '❌ Not enough songs to shuffle.', ephemeral: true });
        return;
      }
      serverQueue.songs = serverQueue.songs.sort(() => Math.random() - 0.5);
      await interaction.editReply({ content: '🔀 Queue shuffled!', ephemeral: true });
    } else if (interaction.customId === 'clear_queue') {
      serverQueue.songs = [];
      const randomActivity = funnyActivities[Math.floor(Math.random() * funnyActivities.length)];
      client.user.setActivity(randomActivity, { type: ActivityType.Custom });
      await interaction.editReply({ content: '🧹 Queue cleared!', ephemeral: true });
    } else if (interaction.customId === 'replay') {
      const guildHistory = history.get(guildId) || [];
      if (!guildHistory.length) {
        await interaction.editReply({ content: '❌ No songs in history.', ephemeral: true });
        return;
      }
      const index = parseInt(interaction.message.components[0].components[0].options?.find((o) => o.default)?.value || '0', 10);
      const song = guildHistory[index];
      if (!song) {
        await interaction.editReply({ content: '❌ Invalid history song.', ephemeral: true });
        return;
      }
      serverQueue.songs.unshift({ ...song, stream: await getStream(song.url) });
      player.stop();
      await interaction.editReply({ content: `🎶 Replaying: **${song.title}**`, ephemeral: true });
    }
  } catch (error) {
    console.error(`Error in handleMusicButtonInteraction (${interaction.customId}, ${interactionId}): ${error.message}`);
    await interaction.editReply({ content: `❌ Error: ${error.message}`, ephemeral: true });
  } finally {
    handledInteractions.delete(interactionId);
  }
}

// Command handler
const commands = new Map();
const commandFiles = fs.readdirSync(path.join(__dirname, 'commands')).filter((file) => file.endsWith('.js'));
for (const file of commandFiles) {
  try {
    const command = require(`./commands/${file}`);
    commands.set(command.data.name, command);
    console.log(`✅ Loaded command: ${command.data.name} from ${file}`);
  } catch (error) {
    console.error(`❌ Failed to load command ${file}: ${error.message}`);
  }
}

// Client events
client.once('ready', async () => {
  console.log(`✅ Bot is online as ${client.user.tag}`);
  const randomActivity = funnyActivities[Math.floor(Math.random() * funnyActivities.length)];
  client.user.setActivity(randomActivity, { type: ActivityType.Custom });

  setInterval(() => {
    if (!queues.size || !Object.values(queues).some(q => q.playing)) {
      const randomActivity = funnyActivities[Math.floor(Math.random() * funnyActivities.length)];
      client.user.setActivity(randomActivity, { type: ActivityType.Custom });
    }
  }, 5 * 60 * 1000);

  const guild = client.guilds.cache.get(process.env.GUILD_ID);
  if (!guild) {
    console.warn('❌ Could not find guild:', process.env.GUILD_ID);
    return;
  }
  try {
    await guild.edit({ systemChannelId: process.env.WELCOME_CHANNEL_ID });
    console.log('✅ System channel set to', process.env.WELCOME_CHANNEL_ID);
  } catch (err) {
    console.error('❌ Failed to set system channel:', err.message);
  }

  // Silo codes message updates
  let messageToUpdate = null;
  if (fs.existsSync('./silo-message.json')) {
    try {
      const data = JSON.parse(fs.readFileSync('./silo-message.json', 'utf-8'));
      const { channelId, messageId } = data || {};
      if (!channelId || !messageId || isNaN(channelId) || isNaN(messageId)) {
        console.warn('Invalid or missing channelId/messageId in silo-message.json, cleaning up');
        fs.unlinkSync('./silo-message.json');
      } else {
        const channel = await client.channels.fetch(channelId).catch((err) => {
          console.error('Failed to fetch channel:', err.message);
          return null;
        });
        if (channel) {
          messageToUpdate = await channel.messages.fetch(messageId).catch((err) => {
            console.error('Failed to fetch message:', err.message);
            return null;
          });
        }
        if (!messageToUpdate || !messageToUpdate.editable) {
          console.warn('Silo codes message not found or not editable, cleaning up');
          fs.unlinkSync('./silo-message.json');
          messageToUpdate = null;
        }
      }
    } catch (err) {
      console.error('Error parsing silo-message.json:', err.message);
      fs.unlinkSync('./silo-message.json');
    }
  }

  const sendOrUpdateEmbed = async () => {
    let codes;
    try {
      codes = JSON.parse(fs.readFileSync('./codes.json', 'utf-8'));
    } catch (err) {
      throw new Error('Invalid codes.json format');
    }
    if (!Array.isArray(codes) || codes.length === 0) throw new Error('No codes found');

    const now = new Date();
    const expiryDate = new Date(Date.UTC(2025, 6, 7, 0, 0, 0));
    const remaining = expiryDate.getTime() - now.getTime();
    const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
    const hours = Math.floor((remaining / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((remaining / (1000 * 60)) % 60);
    const countdown = `${days}d ${hours}h ${minutes}m`;
    const expiryUnix = Math.floor(expiryDate.getTime() / 1000);
    const msg = codes.map(c => `\`\`\`🟢 ${c.description} — ${c.code}\`\`\``).join('\n');

    return new EmbedBuilder()
      .setTitle('📡 NEXUS Silo Broadcast: Result Found!')
      .setDescription(msg)
      .addFields({ name: 'Codes Expire In', value: `${countdown} (Expires <t:${expiryUnix}:F>)`, inline: false })
      .setColor(0xf5d142)
      .setImage('https://i.postimg.cc/1XzJj2Vw/Chat-GPT-Image-Jul-1-2025-06-14-52-AM.png')
      .setFooter({ text: 'Thanks to NukaCrypt & Nexus AI 🤖' })
      .setTimestamp();
  };

  const updateSiloMessage = async () => {
    try {
      if (!messageToUpdate || !messageToUpdate.editable) {
        if (fs.existsSync('./silo-message.json')) {
          fs.unlinkSync('./silo-message.json');
        }
        const channel = client.channels.cache.get(process.env.WELCOME_CHANNEL_ID) || (await client.channels.fetch(process.env.WELCOME_CHANNEL_ID).catch(() => null));
        if (channel && channel.isTextBased()) {
          messageToUpdate = await channel.send({ embeds: [await sendOrUpdateEmbed()] });
          fs.writeFileSync('./silo-message.json', JSON.stringify({
            channelId: messageToUpdate.channel.id,
            messageId: messageToUpdate.id
          }, null, 2));
        } else {
          console.error('No valid channel found for initial message');
          return;
        }
      } else {
        await messageToUpdate.edit({ embeds: [await sendOrUpdateEmbed()] });
      }
    } catch (err) {
      console.error('Error updating silo codes message:', err.message);
      if (messageToUpdate && fs.existsSync('./silo-message.json')) {
        fs.unlinkSync('./silo-message.json');
      }
      messageToUpdate = null;
    }
  };

  await updateSiloMessage();
  setInterval(updateSiloMessage, 60 * 1000);
});

client.on('guildMemberAdd', (member) => {
  console.log(`🟢 guildMemberAdd fired for ${member.user.tag}`);
  const ch = member.guild.channels.cache.get(process.env.WELCOME_CHANNEL_ID);
  if (!ch || !ch.isTextBased()) {
    console.warn('❌ Welcome channel invalid:', process.env.WELCOME_CHANNEL_ID);
    return;
  }
  const embed = new EmbedBuilder()
    .setTitle('👋 Welcome to Deadside of Fallout!')
    .setDescription(`Hey ${member}, glad you’re here! You'll usually find our online members in the voice channels.`)
    .setColor(0x00AE86)
    .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
    .setTimestamp();
  ch.send({ embeds: [embed] }).catch((err) => console.error('❌ Failed to send welcome embed:', err.message));
});

client.on('interactionCreate', async (interaction) => {
  if (interaction.isChatInputCommand()) {
    const command = commands.get(interaction.commandName);
    if (!command) {
      console.warn(`❌ Command not found: ${interaction.commandName}`);
      return;
    }
    await executeCommand(interaction, async () => {
      if (command.permissions) {
        const botMember = interaction.guild.members.me;
        for (const perm of command.permissions) {
          if (!botMember.permissions.has(perm)) {
            throw new Error(`Bot lacks ${perm} permission`);
          }
        }
      }
      await command.execute(interaction, {
        client,
        player,
        queues,
        history,
        getOrJoinVoiceChannel,
        getStream,
        playNext,
        retryRequest,
        RADIO_STATIONS,
        splitMessage,
        firstResultOrFail,
        validateYouTubeURL,
        extractYouTubeID,
        genius,
      });
    });
  } else if (interaction.isButton()) {
    await executeCommand(interaction, async () => {
      if (['yes', 'no', 'replay'].includes(interaction.customId)) {
        return;
      }
      await handleMusicButtonInteraction(interaction);
    });
  } else if (interaction.isStringSelectMenu()) {
    await executeCommand(interaction, async () => {
      if (interaction.customId === 'select_song') {
        const guildId = interaction.guildId;
        const serverQueue = queues.get(guildId);
        if (!serverQueue) throw new Error('Queue not found');
        const index = parseInt(interaction.values[0], 10);
        if (isNaN(index) || !serverQueue.songs[index]) throw new Error('Invalid song selection');
        const [selectedSong] = serverQueue.songs.splice(index, 1);
        serverQueue.songs.unshift({ ...selectedSong, stream: await getStream(selectedSong.url) });
        serverQueue.skipVotes.clear();
        player.stop();
        await interaction.reply({ content: `🎶 Now playing: **${selectedSong.title}**`, ephemeral: true });
      } else if (interaction.customId === 'select_tadpole_category') {
        const command = commands.get('tadpole');
        if (!command || !command.handleInteraction) {
          throw new Error('Tadpole command or select menu handler not found');
        }
        await command.handleInteraction(interaction);
      } else if (interaction.customId === 'select_possum_category') {
        const command = commands.get('possum');
        if (!command || !command.handleInteraction) {
          throw new Error('Possum command or select menu handler not found');
        }
        await command.handleInteraction(interaction);
      }
    });
  }
});

// Handle Xbox API errors globally
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      throw new Error('Invalid OpenXBL API key. Please contact the bot admin.');
    }
    throw error;
  },
);

client.login(process.env.DISCORD_TOKEN).catch((err) => console.error('❌ Failed to login:', err.message));