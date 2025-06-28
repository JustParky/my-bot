// ✅ Native fetch, no import needed (works on Node 18+)

const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } = require('discord.js');
const {
  joinVoiceChannel,
  getVoiceConnection,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  StreamType,
} = require('@discordjs/voice');
const play = require('play-dl');
const ytdl = require('@distube/ytdl-core');
const fs = require('fs');
const Parser = require('rss-parser');
const parser = new Parser();
let lastTweet = null;

require('dotenv').config();

// Xbox API setup
const createXbox = require('xbox-webapi');
const xbox = createXbox({
  clientId: process.env.XBOX_CLIENT_ID,
  clientSecret: process.env.XBOX_CLIENT_SECRET,
  userToken: process.env.XBOX_REFRESH_TOKEN,
  uhs: process.env.XBOX_UHS,
});

// Spotify setup
if (
  process.env.SPOTIFY_CLIENT_ID &&
  process.env.SPOTIFY_CLIENT_SECRET &&
  process.env.SPOTIFY_REDIRECT_URI
) {
  play.setToken({
    spotify: {
      client_id: process.env.SPOTIFY_CLIENT_ID,
      client_secret: process.env.SPOTIFY_CLIENT_SECRET,
      redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
    },
  });
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const player = createAudioPlayer();
const queues = new Map();

client.once('ready', async () => {
  console.log(`✅ Bot is online as ${client.user.tag}`);



// 📡 RSS Poller for Tweets (Embed Version)
const tweetFeedURL = 'https://rsshub.app/twitter/user/DeadsideGame'; // Change to desired Twitter/X username
const tweetChannelId = '1387288853924155462'; // Replace with your real Discord channel ID

setInterval(async () => {
  try {
    const feed = await parser.parseURL(tweetFeedURL);
    const latest = feed.items[0];

    if (latest && latest.link !== lastTweet) {
      lastTweet = latest.link;
      const channel = client.channels.cache.get(tweetChannelId);
      if (channel) {
        const tweetEmbed = new EmbedBuilder()
          .setTitle(`🐦 New Tweet from ${feed.title.replace(/ \\(@.*\\)/, '')}`)
          .setURL(latest.link)
          .setDescription(latest.contentSnippet || 'No preview available.')
          .setColor(0x1DA1F2) // Twitter Blue
          .setFooter({ text: 'Posted via Twitter', iconURL: 'https://abs.twimg.com/icons/apple-touch-icon-192x192.png' })
          .setTimestamp(new Date(latest.pubDate));

        await channel.send({ embeds: [tweetEmbed] });
      }
    }
  } catch (err) {
    console.error('RSS fetch failed:', err);
  }
}, 60 * 1000); // every 60s








  // Authenticate with Xbox Live
  try {
    await xbox.isAuthenticated();
    console.log('✅ Authenticated with Xbox Live');
  } catch (err) {
    console.error('❌ Xbox authentication failed:', err);
  }
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  const { commandName } = interaction;
  const guildId = interaction.guildId;
  const member = interaction.member;
  const channel = interaction.channel;

  try {
    if (commandName === 'hello') {
      await interaction.reply('👋 Hello! I’m Mr. GutsAI, Your personal AI assistant. Note: My developer is still in build mode, so expect a few bugs & radroaches among my files.');

    } else if (commandName === 'roll') {
      const roll = Math.floor(Math.random() * 6) + 1;
      await interaction.reply(`🎲 You rolled a ${roll}`);

    } else if (commandName === 'userinfo') {
      const embed = new EmbedBuilder()
        .setTitle('👤 User Info')
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .addFields(
          { name: 'Username', value: member.user.tag, inline: true },
          { name: 'User ID', value: member.id, inline: true },
          {
            name: 'Created On',
            value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:F>`,
            inline: false,
          },
          {
            name: 'Joined Server',
            value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>`,
            inline: false,
          }
        )
        .setColor(0x3498db)
        .setFooter({ text: `Requested by ${member.user.tag}` })
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });

    
} else if (commandName === 'silo-codes') {
  try {
    const codes = JSON.parse(fs.readFileSync('./codes.json', 'utf-8'));

    if (!Array.isArray(codes) || codes.length === 0) {
      return interaction.reply('❌ No codes found right now.');
    }

    // ⏱️ Calculate next Monday 23:59 UTC
    const now = new Date();
    const dayOfWeek = now.getUTCDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const daysUntilMonday = (8 - dayOfWeek) % 7 || 7;
    let expiryDate = new Date(now);
    expiryDate.setUTCDate(now.getUTCDate() + daysUntilMonday);
    expiryDate.setUTCHours(24, 0, 0, 0);

    const expiryUnix = Math.floor(expiryDate.getTime() / 1000);
    const remaining = expiryDate.getTime() - now.getTime();
    const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
    const hours = Math.floor((remaining / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((remaining / (1000 * 60)) % 60);
    const countdown = `${days}d ${hours}h ${minutes}m`;

    const msg = codes
      .map(c => `\`\`\`🟢 ${c.description} — ${c.code}\`\`\``)
      .join('\n');

    const embed = new EmbedBuilder()
      .setTitle('📡 Mr. GutsAI Broadcast: Operation Japseye')
      .setDescription(msg)
      .addFields({
        name: 'These Nuke Codes Will Expire 👇',
        value: `<t:${expiryUnix}:F> — <t:${expiryUnix}:R>\n🕒   ${countdown}`,
        inline: false
      })
      .setColor(0xf5d142)
      
      .setImage('https://i.ibb.co/JFMLwZGs/aaaa.png')
      .setFooter({
        text: 'Data Mined by Mr. GutsAI v1.0 🤖',
      })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });

  } catch (err) {
    console.error('Error reading codes.json:', err);
    await interaction.reply('❌ Failed to load silo codes.');
  }



    } else if (commandName === 'join') {
      if (!member.voice.channel)
        return interaction.reply('🎧 Join a voice channel first!');
      joinVoiceChannel({
        channelId: member.voice.channel.id,
        guildId,
        adapterCreator: interaction.guild.voiceAdapterCreator,
      });
      await interaction.reply('🔊 Joined the voice channel.');

    } else if (commandName === 'leave') {
      const conn = getVoiceConnection(guildId);
      if (conn) {
        conn.destroy();
        queues.delete(guildId);
        await interaction.reply('👋 Left the voice channel.');
      } else {
        await interaction.reply('❌ I’m not in a voice channel.');
      }

    } else if (commandName === 'pause') {
      player.pause();
      await interaction.reply('⏸️ Paused the music.');

    } else if (commandName === 'resume') {
      player.unpause();
      await interaction.reply('▶️ Resumed the music.');

    } else if (commandName === 'skip') {
      player.stop();
      await interaction.reply('⏭️ Skipped the song.');

    } else if (commandName === 'stop') {
      const conn = getVoiceConnection(guildId);
      if (conn) {
        conn.destroy();
        queues.delete(guildId);
        await interaction.reply('🛑 Stopped and left the voice channel.');
      } else {
        await interaction.reply('❌ Not in any voice channel.');
      }

    } else if (commandName === 'queue') {
      const serverQueue = queues.get(guildId);
      if (!serverQueue || !serverQueue.songs.length)
        return interaction.reply('📬 Queue is empty.');
      const queueList = serverQueue.songs
        .map((s, i) => `${i + 1}. ${s.title} (requested by ${s.requestedBy})`)
        .join('\n');
      await interaction.reply(`📃 **Current Queue:**\n${queueList}`);

    } else if (commandName === 'play') {
      const query = interaction.options.getString('query');
      if (!member.voice.channel)
        return interaction.reply('🎧 Join a voice channel first.');

      await interaction.deferReply();
      const connection =
        getVoiceConnection(guildId) ||
        joinVoiceChannel({
          channelId: member.voice.channel.id,
          guildId,
          adapterCreator: interaction.guild.voiceAdapterCreator,
        });

      try {
        let url = query;
        if (query.includes('spotify.com')) {
          const sp = await play.spotify(query);
          const res = await play.search(`${sp.name} ${sp.artists[0].name}`, { limit: 1 });
          url = res[0].url;
        } else if (!ytdl.validateURL(query)) {
          const res = await play.search(query, { limit: 1 });
          url = res[0].url;
        }

        const info = await ytdl.getInfo(url);
        const song = {
          title: info.videoDetails.title,
          url,
          stream: ytdl(url, {
            filter: 'audioonly',
            quality: 'highestaudio',
            highWaterMark: 1 << 25,
          }),
          requestedBy: member.user.tag,
        };

        if (!queues.has(guildId))
          queues.set(guildId, { connection, songs: [], playing: false });
        const serverQueue = queues.get(guildId);
        serverQueue.songs.push(song);

        if (!serverQueue.playing) playNext(guildId, channel);
        await interaction.editReply(`🎵 Queued: **${song.title}**`);
      } catch (err) {
        console.error('Play error:', err.message);
        const replyFn =
          interaction.deferred || interaction.replied
            ? interaction.editReply.bind(interaction)
            : interaction.reply.bind(interaction);
        await replyFn(`❌ Couldn’t play the song: ${err.message}`);
      }

    } else if (commandName === 'xbox-profile') {
      const tag = interaction.options.getString('gamertag');
      await interaction.deferReply();
      try {
        const profileProvider = xbox.getProvider('profile');
        const profileResponse = await profileProvider.get_profile_by_gamertag(tag);
        const settings = profileResponse.profileUsers[0].settings;
        const pic = settings.find((s) => s.id === 'GameDisplayPicRaw').value;
        const tier = settings.find((s) => s.id === 'AccountTier').value;

        const embed = new EmbedBuilder()
          .setTitle(`🎮 ${tag} on Xbox Live`)
          .setThumbnail(pic)
          .addFields(
            { name: 'Tier', value: tier, inline: true },
            { name: 'Gamertag', value: tag, inline: true }
          )
          .setColor(0x107c10)
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
      } catch (err) {
        console.error('Xbox profile error:', err);
        await interaction.editReply(`❌ Couldn’t fetch profile for \`${tag}\``);
      }
    }
  } catch (error) {
    console.error('Interaction error:', error);
    const fallback =
      interaction.deferred || interaction.replied
        ? interaction.editReply.bind(interaction)
        : interaction.reply.bind(interaction);
    await fallback('❌ An unexpected error occurred.');
  }
});

async function playNext(guildId, channel) {
  const serverQueue = queues.get(guildId);
  if (!serverQueue) return;

  const song = serverQueue.songs.shift();
  if (!song) {
    serverQueue.connection.destroy();
    queues.delete(guildId);
    return channel.send('📭 Queue finished.');
  }

  try {
    const resource = createAudioResource(song.stream, {
      inputType: StreamType.Arbitrary,
    });

    player.play(resource);
    serverQueue.connection.subscribe(player);
    serverQueue.playing = true;

    const embed = new EmbedBuilder()
      .setTitle('🎶 Now Playing')
      .setDescription(`**${song.title}**\nRequested by: ${song.requestedBy}`)
      .setColor(0x1db954)
      .setThumbnail(`https://img.youtube.com/vi/${extractYouTubeID(song.url)}/hqdefault.jpg`)
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('pause')
        .setLabel('⏯ Pause/Resume')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('skip')
        .setLabel('⏭ Skip')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('stop')
        .setLabel('⏹ Stop')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('queue')
        .setLabel('📜 Queue')
        .setStyle(ButtonStyle.Secondary)
    );

    const message = await channel.send({ embeds: [embed], components: [row] });

    const collector = message.createMessageComponentCollector({ time: 5 * 60 * 1000 });

    collector.on('collect', async (i) => {
      if (
        i.user.id !== song.requestedBy &&
        !i.member.permissions.has(PermissionsBitField.Flags.ManageGuild)
      ) {
        return i.reply({ content: '❌ You cannot control this song.', ephemeral: true });
      }

      if (i.customId === 'pause') {
        if (player.state.status === AudioPlayerStatus.Playing) {
          player.pause();
          await i.reply({ content: '⏸ Paused', ephemeral: true });
        } else {
          player.unpause();
          await i.reply({ content: '▶️ Resumed', ephemeral: true });
        }
      } else if (i.customId === 'skip') {
        player.stop();
        await i.reply({ content: '⏭ Skipped', ephemeral: true });
      } else if (i.customId === 'stop') {
        serverQueue.connection.destroy();
        queues.delete(guildId);
        player.stop();
        await i.reply({ content: '🛑 Stopped.', ephemeral: true });
      } else if (i.customId === 'queue') {
        const q = serverQueue.songs;
        if (!q.length)
          return i.reply({ content: '📭 Queue is empty.', ephemeral: true });
        const list = q
          .map((s, idx) => `${idx + 1}. ${s.title} (requested by ${s.requestedBy})`)
          .join('\n');
        await i.reply({ content: `📃 **Queue:**\n${list}`, ephemeral: true });
      }
    });

    player.once(AudioPlayerStatus.Idle, () => {
      serverQueue.playing = false;
      playNext(guildId, channel);
    });

    player.on('error', (error) => {
      console.error('AudioPlayer error:', error.message);
      channel.send(`❌ Error: ${error.message}`);
      playNext(guildId, channel);
    });
  } catch (err) {
    console.error('playNext error:', err.message);
    channel.send('❌ Error playing song. Skipping...');
    playNext(guildId, channel);
  }
}

function extractYouTubeID(url) {
  const match = url.match(/(?:v=|\/)([0-9A-Za-z_-]{11})/);
  return match ? match[1] : '';
}

client.login(process.env.DISCORD_TOKEN);
