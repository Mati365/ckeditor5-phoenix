defmodule CKEditor5.License.Extractor do
  @moduledoc false

  alias CKEditor5.Errors

  @doc """
  Extracts distribution channel from license key.

  The `distributionChannel` claim can be `nil`, a single string or a list of strings.
  For a list, `"cloud"` is returned if present, otherwise `"sh"`; unknown entries are ignored.
  A list without any known channel is rejected, because a `nil` channel would make
  the license compatible with every distribution.
  """
  def distribution_channel("GPL"), do: {:ok, "sh"}

  def distribution_channel(key) do
    with parts when length(parts) == 3 <- String.split(key, "."),
         [_header, payload, _signature] <- parts,
         {:ok, decoded_payload} <- Base.url_decode64(payload, padding: false),
         {:ok, json} <- Jason.decode(decoded_payload),
         {:ok, channel} <- parse_distribution_channel(Map.get(json, "distributionChannel")) do
      {:ok, channel}
    else
      _ -> {:error, %Errors.InvalidLicenseKey{key: key}}
    end
  end

  defp parse_distribution_channel(nil), do: {:ok, nil}
  defp parse_distribution_channel(channel) when is_binary(channel), do: {:ok, channel}

  defp parse_distribution_channel(channels) when is_list(channels) do
    cond do
      "cloud" in channels -> {:ok, "cloud"}
      "sh" in channels -> {:ok, "sh"}
      true -> :error
    end
  end

  defp parse_distribution_channel(_), do: :error
end
