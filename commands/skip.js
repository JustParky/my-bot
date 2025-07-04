const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('skip')
    .setDescription('Skip the current song'),
  permissions: [],
  async execute(interaction, { queues, player }) {
    console.log('Executing /skip command');
    await interaction.deferReply({ flags: 64 });
    const guildId = interaction.guildId;
    const member = interaction.member;

    try {
      const serverQueue = queues.get(guildId);
      if (!serverQueue || !serverQueue.currentSong) {
        return interaction.editReply({ content: '❌ No music is currently playing.', flags: 64 });
      }

      if (member.user.id !== serverQueue.currentSong.requestedBy && !member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
        return interaction.editReply({ content: '❌ You cannot skip this song. Use /vote_skip instead.', flags: 64 });
      }

      serverQueue.skipVotes.clear();
      player.stop();
      await interaction.editReply({ content: '⏭ Skipped the current song.', flags: 64 });
    } catch (error) {
      console.error('Error in /skip command:', error.message);
      await interaction.editReply({ content: `❌ Error: ${error.message}`, flags: 64 });
    }
  },
};