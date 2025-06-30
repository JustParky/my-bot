const { SlashCommandBuilder, createAudioResource, StreamType } = require('discord.js');
const { ServerQueue, getStream } = require('../utils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('seek')
    .setDescription('Seek to a timestamp')
    .addStringOption(option =>
      option.setName('time')
        .setDescription('Time in seconds or mm:ss')
        .setRequired(true)),
  permissions: [],
  async execute(interaction, { queues, player, getStream, createAudioResource, StreamType }) {
    console.log('Executing /seek command');
    await interaction.deferReply();
    const guildId = interaction.guildId;
    const time = interaction.options.getString('time');

    try {
      const serverQueue = queues.get(guildId);
      if (!serverQueue || !serverQueue.currentSong) {
        return interaction.editReply('❌ No music is currently playing.');
      }

      let seconds;
      if (time.includes(':')) {
        const [minutes, secs] = time.split(':').map(Number);
        seconds = minutes * 60 + secs;
      } else {
        seconds = parseInt(time, 10);
      }

      if (isNaN(seconds) || seconds < 0 || seconds >= serverQueue.currentSong.duration) {
        return interaction.editReply('❌ Invalid or out-of-range timestamp.');
      }

      const stream = await getStream(serverQueue.currentSong.url);
      const resource = createAudioResource(stream, {
        inputType: StreamType.Arbitrary,
        inlineVolume: true,
        metadata: { seek: seconds },
      });
      resource.volume.setVolume(serverQueue.volume);
      player.play(resource);
      await interaction.editReply(`⏩ Seeked to ${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`);
    } catch (error) {
      console.error('Error in /seek command:', error.message);
      await interaction.editReply(`❌ Error: ${error.message}`);
    }
  },
};