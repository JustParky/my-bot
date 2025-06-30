require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField, ActivityType } = require('discord.js');
const { createAudioPlayer, AudioPlayerStatus, createAudioResource, StreamType } = require('@discordjs/voice');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const Genius = require('genius-lyrics');
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
      .filter(f => f.endsWith('.mp3') || f.endsWith('.wav'))
      .reduce((acc, file) => ({
        ...acc,
        [file.split('.')[0].toLowerCase()]: path.join(audioDir, file),
      }), {})
  : {};
console.log(`Audio directory: ${audioDir}, Files: ${Object.keys(RADIO_STATIONS).join(', ') || 'none'}`);


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
refreshSpotifyToken(); // Initial refresh
setInterval(refreshSpotifyToken, 30 * 60 * 1000); // Refresh every 30 minutes

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

const player = createAudioPlayer();
const queues = new Map();
const apiCache = new Map(); // In-memory cache for Xbox API responses
const history = new Map(); // Song history per guild
const genius = process.env.GENIUS_API_KEY ? new Genius.Client(process.env.GENIUS_API_KEY) : null;

// Reusable music control components
const musicControlsRow1 = new ActionRowBuilder().addComponents(
  new ButtonBuilder().setCustomId('vol_down').setLabel('🔉 -25%').setStyle(ButtonStyle.Primary),
  new ButtonBuilder().setCustomId('pause').setLabel('⏯ Play/Pause').setStyle(ButtonStyle.Primary),
  new ButtonBuilder().setCustomId('vol_up').setLabel('🔊 +25%').setStyle(ButtonStyle.Primary)
);

const musicControlsRow2 = new ActionRowBuilder().addComponents(
  new ButtonBuilder().setCustomId('skip').setLabel('⏭ Skip').setStyle(ButtonStyle.Secondary),
  new ButtonBuilder().setCustomId('shuffle').setLabel('⇄ Shuffle').setStyle(ButtonStyle.Secondary),
  new ButtonBuilder().setCustomId('loop').setLabel('⟲ Loop').setStyle(ButtonStyle.Secondary)
);

const musicControlsRow3 = new ActionRowBuilder().addComponents(
  new ButtonBuilder().setCustomId('stop').setLabel('⏹ Stop').setStyle(ButtonStyle.Danger),
  new ButtonBuilder().setCustomId('clear_queue').setLabel('❌ Clear').setStyle(ButtonStyle.Danger),
  new ButtonBuilder().setCustomId('vote_skip').setLabel('🗳️ Skip').setStyle(ButtonStyle.Success),
  new ButtonBuilder().setCustomId('queue').setLabel('⏳ Queue').setStyle(ButtonStyle.Secondary)
);

const pollButtons = new ActionRowBuilder().addComponents(
  new ButtonBuilder().setCustomId('yes').setLabel('Yes').setStyle(ButtonStyle.Success),
  new ButtonBuilder().setCustomId('no').setLabel('No').setStyle(ButtonStyle.Danger),
);
const historyButtons = new ActionRowBuilder().addComponents(
  new ButtonBuilder().setCustomId('replay').setLabel('▶️ Replay').setStyle(ButtonStyle.Primary),
);

// Xbox API retry request
async function retryRequest(url, options, retries = 3, backoff = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      const cacheKey = `${url}:${JSON.stringify(options)}`;
      if (apiCache.has(cacheKey)) {
        const cached = apiCache.get(cacheKey);
        if (Date.now() - cached.timestamp < 5 * 60 * 1000) return cached.data; // Cache valid for 5 minutes
      }
      const response = await axios(url, options);
      apiCache.set(cacheKey, { data: response, timestamp: Date.now() });
      return response;
    } catch (error) {
      if (error.response?.status === 429 && i < retries - 1) {
        console.warn(`Rate limit hit, retrying after ${backoff}ms`);
        await new Promise(resolve => setTimeout(resolve, backoff));
        backoff *= 2; // Exponential backoff
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
    console.error(`Command ${interaction.commandName || interaction.customId} failed:`, error);
    if (interaction.isRepliable()) {
      const replyFn = interaction.deferred || interaction.replied ? interaction.editReply : interaction.reply;
      await replyFn({ content: `❌ Error: ${error.message}`, flags: 64 }).catch(err => {
        console.error('Failed to send error reply:', err.message);
      });
    } else {
      console.warn('Interaction is not repliable:', interaction.customId || interaction.commandName);
    }
  }
}

// Music playback
async function playNext(guildId, channel) {
  console.log(`playNext called for guild: ${guildId}`);
  const serverQueue = queues.get(guildId);
  if (!serverQueue) {
    console.warn('⚠️ No server queue found for guild:', guildId);
    return channel.send('❌ No queue found.');
  }
  if (!serverQueue.connection?.state?.status) {
    console.warn('⚠️ Voice connection is invalid or destroyed');
    queues.delete(guildId);
    return channel.send('❌ Lost voice connection. Please use /join to reconnect.');
  }
  const song = serverQueue.songs.shift();
  if (!song) {
    serverQueue.playing = false;
    client.user.setActivity('Idle', { type: ActivityType.Playing });
    const message = await channel.send('🤖 Queue is empty! Add another banger if you want to hear more.');
    setTimeout(() => {
      if (queues.has(guildId) && !queues.get(guildId).songs.length && !queues.get(guildId).playing) {
        serverQueue.connection.destroy();
        queues.delete(guildId);
        message.edit('👋 Nexus has left the voice channel.');
      }
    }, 20000);
    return;
  }
  if (serverQueue.currentSong) {
    if (!history.has(guildId)) history.set(guildId, []);
    history.get(guildId).unshift(serverQueue.currentSong);
    if (history.get(guildId).length > 50) history.get(guildId).pop(); // Limit history to 50 songs
  }
  serverQueue.lastPlayed = serverQueue.currentSong || null;
  serverQueue.currentSong = song;
  if (serverQueue.loop) serverQueue.songs.push(song);
  try {
    const resource = createAudioResource(song.stream, {
      inputType: StreamType.Arbitrary,
      inlineVolume: true,
    });
    resource.volume.setVolume(serverQueue.volume);
    console.log(`Playing song: ${song.title}`);
    player.play(resource);
    serverQueue.connection.subscribe(player);
    serverQueue.playing = true;
    serverQueue.skipVotes.clear();
    client.user.setActivity(song.title, { type: ActivityType.Streaming, url: song.url });
    const duration = song.duration ? `${Math.floor(song.duration / 60)}:${(song.duration % 60).toString().padStart(2, '0')}` : 'Unknown';
    const embed = new EmbedBuilder()
      .setTitle('🎶 Now Playing')
      .setDescription(`**${song.title}**\nRequested by: ${song.requestedBy}\nDuration: ${duration}`)
      .addFields(serverQueue.lastPlayed ? [{ name: 'Last Played', value: serverQueue.lastPlayed.title, inline: true }] : [])
      .setColor(0x1db954)
      .setImage(song.source === 'youtube' ? `https://img.youtube.com/vi/${extractYouTubeID(song.url)}/hqdefault.jpg` : null)
      .setTimestamp();
    if (serverQueue.controllerMessage && !serverQueue.controllerMessage.deleted) {
      await serverQueue.controllerMessage.delete().catch(() => {});
    }
    serverQueue.controllerMessage = await channel.send({
      embeds: [embed],
      components: [musicControlsRow1, musicControlsRow2, musicControlsRow3],
    });
    const collector = serverQueue.controllerMessage.createMessageComponentCollector({ time: 5 * 60 * 1000 });
    collector.on('collect', async (i) => executeCommand(i, handleMusicButtonInteraction));
    player.once(AudioPlayerStatus.Idle, async () => {
      try {
        if (!serverQueue.loop) {
          serverQueue.playing = false;
          if (serverQueue.controllerMessage && !serverQueue.controllerMessage.deleted) {
            await serverQueue.controllerMessage.delete().catch(() => {});
          }
          serverQueue.controllerMessage = null;
          await playNext(guildId, channel);
        }
      } catch (err) {
        console.error('❌ Error in AudioPlayer Idle event:', err.message);
        channel.send('❌ Something went wrong while playing the next song. Skipping...');
        await playNext(guildId, channel);
      }
    });
    player.on('error', (error) => {
      console.error('AudioPlayer error:', error.message);
      channel.send(`❌ Error: ${error.message}`);
      playNext(guildId, channel);
    });
  } catch (err) {
    console.error('playNext error:', err.message);
    channel.send('❌ Error playing song. Skipping...');
    await playNext(guildId, channel);
  }
}

// Button interaction handler
async function handleMusicButtonInteraction(interaction) {
  try {
    await interaction.deferReply({ ephemeral: true }); // Defer immediately to extend response window
    const guildId = interaction.guildId;
    const serverQueue = queues.get(guildId);
    if (!serverQueue) {
      return interaction.editReply({ content: '❌ No music is currently playing.' });
    }
    if (!interaction.member.voice.channel) {
      return interaction.editReply({ content: '❌ You must be in a voice channel to interact with the player.' });
    }
    if (interaction.customId !== 'vote_skip' && interaction.user.id !== serverQueue.currentSong?.requestedBy && !interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
      return interaction.editReply({ content: '❌ You cannot control this song.' });
    }
    if (interaction.customId === 'pause') {
      if (player.state.status === AudioPlayerStatus.Playing) {
        player.pause();
        await interaction.editReply({ content: '⏸ Paused' });
      } else {
        player.unpause();
        await interaction.editReply({ content: '▶️ Resumed' });
      }
    } else if (interaction.customId === 'skip') {
      serverQueue.skipVotes.clear();
      player.stop();
      await interaction.editReply({ content: '⏭ Skipped' });
    } else if (interaction.customId === 'vote_skip') {
      const voiceChannel = interaction.member.voice.channel;
      const memberCount = voiceChannel.members.filter(m => !m.user.bot).size;
      const requiredVotes = Math.ceil(memberCount / 2);
      if (serverQueue.skipVotes.has(interaction.user.id)) {
        return interaction.editReply({ content: '❌ You already voted to skip.' });
      }
      serverQueue.skipVotes.add(interaction.user.id);
      const currentVotes = serverQueue.skipVotes.size;
      await interaction.editReply({
        content: `🗳️ ${interaction.user.username} voted to skip! (${currentVotes}/${requiredVotes})`,
      });
      if (serverQueue.currentSong && currentVotes >= requiredVotes) {
        serverQueue.skipVotes.clear();
        player.stop();
        await interaction.channel.send('🛑 Song skipped! This is Democracy Manifest!');
      }
    } else if (interaction.customId === 'vol_up') {
      serverQueue.volume = Math.min(serverQueue.volume + 0.25, 2.0);
      player.state.resource?.volume?.setVolume(serverQueue.volume);
      await interaction.editReply({ content: `🔊 Volume increased to ${Math.round(serverQueue.volume * 100)}%` });
    } else if (interaction.customId === 'vol_down') {
      serverQueue.volume = Math.max(serverQueue.volume - 0.25, 0.1);
      player.state.resource?.volume?.setVolume(serverQueue.volume);
      await interaction.editReply({ content: `🔉 Volume decreased to ${Math.round(serverQueue.volume * 100)}%` });
    } else if (interaction.customId === 'stop') {
      serverQueue.connection.destroy();
      queues.delete(guildId);
      player.stop();
      client.user.setActivity('Idle', { type: ActivityType.Playing });
      await interaction.editReply({ content: '🛑 Stopped.' });
    } else if (interaction.customId === 'queue') {
      const q = serverQueue.songs;
      if (!q.length) {
        return interaction.editReply({ content: '🤖 Queue is empty! Add another banger if you want to hear more.' });
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
      await interaction.editReply({ content: '📃 **Select a song from the queue:**', components: [row] });
    } else if (interaction.customId === 'loop') {
      serverQueue.loop = !serverQueue.loop;
      await interaction.editReply({ content: serverQueue.loop ? '🔁 Loop mode **enabled**' : '⏹️ Loop mode **disabled**' });
    } else if (interaction.customId === 'shuffle') {
      if (serverQueue.songs.length < 2) {
        return interaction.editReply({ content: '❌ Not enough songs to shuffle.' });
      }
      serverQueue.songs = serverQueue.songs.sort(() => Math.random() - 0.5);
      await interaction.editReply({ content: '🔀 Queue shuffled!' });
    } else if (interaction.customId === 'clear_queue') {
      serverQueue.songs = [];
      await interaction.editReply({ content: '🧹 Queue cleared!' });
    } else if (interaction.customId === 'replay') {
      const guildHistory = history.get(guildId) || [];
      if (!guildHistory.length) {
        return interaction.editReply({ content: '❌ No songs in history.' });
      }
      const index = parseInt(interaction.message.components[0].components[0].options.find(o => o.default)?.value || '0', 10);
      const song = guildHistory[index];
      serverQueue.songs.unshift(song);
      player.stop();
      await interaction.editReply({ content: `🎶 Replaying: **${song.title}**` });
    }
  } catch (error) {
    console.error('Error in handleMusicButtonInteraction:', error);
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ content: `❌ Error: ${error.message}` }).catch(() => {});
    } else if (interaction.isRepliable()) {
      await interaction.reply({ content: `❌ Error: ${error.message}`, ephemeral: true }).catch(() => {});
    }
  }
}

// Command handler
const commands = new Map();
const commandFiles = fs.readdirSync(path.join(__dirname, 'commands')).filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
  try {
    const command = require(`./commands/${file}`);
    commands.set(command.data.name, command);
    console.log(`✅ Loaded command: ${command.data.name} from ${file}`);
  } catch (error) {
    console.error(`❌ Failed to load command ${file}:`, error.message);
  }
}

// Client events
client.once('ready', async () => {
  console.log(`✅ Bot is online as ${client.user.tag}`);
  client.user.setActivity('Idle', { type: ActivityType.Playing });
  const guild = client.guilds.cache.get(process.env.GUILD_ID);
  if (!guild) {
    console.warn('❌ Could not find guild:', process.env.GUILD_ID);
  } else {
    try {
      await guild.edit({ systemChannelId: process.env.WELCOME_CHANNEL_ID });
      console.log('✅ System channel set to', process.env.WELCOME_CHANNEL_ID);
    } catch (err) {
      console.error('❌ Failed to set system channel:', err.message);
    }
  }
});

client.on('guildMemberAdd', (member) => {
  console.log(`🟢 guildMemberAdd fired for ${member.user.tag}`);
  const ch = member.guild.channels.cache.get(process.env.WELCOME_CHANNEL_ID);
  if (!ch || !ch.isTextBased()) {
    return console.warn('❌ Welcome channel invalid:', process.env.WELCOME_CHANNEL_ID);
  }
  const embed = new EmbedBuilder()
    .setTitle('👋 Welcome to Deadside of Fallout!')
    .setDescription(`Hey ${member}, glad you’re here! You'll usually find our online members in the voice channels.`)
    .setColor(0x00AE86)
    .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
    .setTimestamp();
  ch.send({ embeds: [embed] }).catch(err => console.error('❌ Failed to send welcome embed:', err.message));
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
      if (interaction.customId === 'yes' || interaction.customId === 'no' || interaction.customId === 'replay') {
        // Handled by respective collectors
      } else {
        await handleMusicButtonInteraction(interaction);
      }
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
        serverQueue.songs.unshift(selectedSong);
        serverQueue.skipVotes.clear();
        player.stop();
        await interaction.reply({ content: `🎶 Now playing: **${selectedSong.title}**`, flags: 64 });
      }
    });
  }
});

// Handle Xbox API errors globally
axios.interceptors.response.use(
  response => response,
  async (error) => {
    if (error.response?.status === 401) {
      throw new Error('Invalid OpenXBL API key. Please contact the bot admin.');
    }
    throw error;
  },
);

client.login(process.env.DISCORD_TOKEN);