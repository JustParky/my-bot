const { SlashCommandBuilder, createAudioResource, StreamType } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('radio')
    .setDescription('Play a radio station')
    .addStringOption(option =>
      option.setName('station')
        .setDescription('Station name, URL, or file')
        .setRequired(true)),
  permissions: [],
  async execute(interaction, { getOrJoinVoiceChannel, getStream, player, queues, RADIO_STATIONS }) {
    const guildId = interaction.guildId;
    const member = interaction.member;
    const channel = interaction.channel;
    const query = interaction.options.getString('station').toLowerCase();
    const connection = await getOrJoinVoiceChannel(member, guildId, interaction.guild.voiceAdapterCreator);
    let resource;
    const localFilePath = path.join(process.platform === 'win32' ? path.join(__dirname, 'audio') : '/home/container/audio', query);
    if (RADIO_STATIONS[query]) {
      resource = createAudioResource(RADIO_STATIONS[query], { inputType: StreamType.Arbitrary, inlineVolume: true });
    } else if (query.match(/^https?:\/\//)) {
      resource = createAudioResource(await getStream(query), { inputType: StreamType.Arbitrary, inlineVolume: true });
    } else if (fs.existsSync(localFilePath) && (query.endsWith('.mp3') || query.endsWith('.wav'))) {
      resource = createAudioResource(fs.createReadStream(localFilePath), { inputType: StreamType.Raw, inlineVolume: true });
    } else {
      connection.destroy();
      throw new Error(`Invalid input: \`${query}\`. Use a preset station (${Object.keys(RADIO_STATIONS).join(', ')}), a valid URL, or a local file (e.g., song.mp3).`);
    }
    resource.volume?.setVolume(0.5);
    player.play(resource);
    connection.subscribe(player);
    if (!queues.has(guildId)) queues.set(guildId, new ServerQueue(connection, channel));
    const serverQueue = queues.get(guildId);
    serverQueue.playing = true;
    await interaction.reply(`🎙️ Now playing: \`${query}\``);
  },
};