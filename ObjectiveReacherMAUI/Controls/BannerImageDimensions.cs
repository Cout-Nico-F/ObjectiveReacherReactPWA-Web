using System.Buffers.Binary;

namespace ObjectiveReacherMAUI.Controls;

internal static class BannerImageDimensions
{
    public static bool TryRead(string path, out double width, out double height)
    {
        width = 0;
        height = 0;

        try
        {
            using var stream = File.OpenRead(path);
            Span<byte> header = stackalloc byte[32];
            var read = stream.Read(header);
            if (read < 24)
                return false;

            if (header[..8].SequenceEqual(new byte[] { 137, 80, 78, 71, 13, 10, 26, 10 }))
            {
                width = BinaryPrimitives.ReadUInt32BigEndian(header.Slice(16, 4));
                height = BinaryPrimitives.ReadUInt32BigEndian(header.Slice(20, 4));
                return width > 0 && height > 0;
            }

            if (header[0] == 0xFF && header[1] == 0xD8)
            {
                stream.Position = 2;
                return TryReadJpegDimensions(stream, out width, out height);
            }

            if (header[..4].SequenceEqual("RIFF"u8) && header.Slice(8, 4).SequenceEqual("WEBP"u8))
                return TryReadWebpDimensions(header[..read], out width, out height);

            if (header[..3].SequenceEqual("GIF"u8))
            {
                width = BinaryPrimitives.ReadUInt16LittleEndian(header.Slice(6, 2));
                height = BinaryPrimitives.ReadUInt16LittleEndian(header.Slice(8, 2));
                return width > 0 && height > 0;
            }

            if (header[..2].SequenceEqual("BM"u8))
            {
                width = Math.Abs(BinaryPrimitives.ReadInt32LittleEndian(header.Slice(18, 4)));
                height = Math.Abs(BinaryPrimitives.ReadInt32LittleEndian(header.Slice(22, 4)));
                return width > 0 && height > 0;
            }
        }
        catch (IOException)
        {
        }

        return false;
    }

    private static bool TryReadJpegDimensions(Stream stream, out double width, out double height)
    {
        width = height = 0;
        Span<byte> segmentLength = stackalloc byte[2];
        Span<byte> frame = stackalloc byte[5];
        while (stream.Position < stream.Length)
        {
            var markerStart = stream.ReadByte();
            if (markerStart != 0xFF)
                continue;

            int marker;
            do marker = stream.ReadByte(); while (marker == 0xFF);
            if (marker < 0 || marker is 0xD8 or 0xD9 || marker is >= 0xD0 and <= 0xD7)
                continue;

            if (stream.Read(segmentLength) != 2)
                return false;
            var length = BinaryPrimitives.ReadUInt16BigEndian(segmentLength);
            if (length < 2 || length - 2 > stream.Length - stream.Position)
                return false;

            if (marker is 0xC0 or 0xC1 or 0xC2 or 0xC3 or 0xC5 or 0xC6 or 0xC7 or 0xC9 or 0xCA or 0xCB or 0xCD or 0xCE or 0xCF)
            {
                if (stream.Read(frame) != frame.Length)
                    return false;
                height = BinaryPrimitives.ReadUInt16BigEndian(frame.Slice(1, 2));
                width = BinaryPrimitives.ReadUInt16BigEndian(frame.Slice(3, 2));
                return width > 0 && height > 0;
            }

            stream.Seek(length - 2, SeekOrigin.Current);
        }

        return false;
    }

    private static bool TryReadWebpDimensions(ReadOnlySpan<byte> header, out double width, out double height)
    {
        width = height = 0;
        if (header.Length < 30)
            return false;

        if (header.Slice(12, 4).SequenceEqual("VP8X"u8))
        {
            width = 1 + header[24] + (header[25] << 8) + (header[26] << 16);
            height = 1 + header[27] + (header[28] << 8) + (header[29] << 16);
            return true;
        }

        if (header.Slice(12, 4).SequenceEqual("VP8L"u8) && header.Length >= 25 && header[20] == 0x2F)
        {
            width = 1 + header[21] + ((header[22] & 0x3F) << 8);
            height = 1 + (header[22] >> 6) + (header[23] << 2) + ((header[24] & 0x0F) << 10);
            return true;
        }

        if (header.Slice(12, 4).SequenceEqual("VP8 "u8) && header.Length >= 30)
        {
            width = BinaryPrimitives.ReadUInt16LittleEndian(header.Slice(26, 2)) & 0x3FFF;
            height = BinaryPrimitives.ReadUInt16LittleEndian(header.Slice(28, 2)) & 0x3FFF;
            return width > 0 && height > 0;
        }

        return false;
    }
}