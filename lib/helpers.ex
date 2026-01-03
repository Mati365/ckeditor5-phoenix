defmodule CKEditor5.Helpers do
  @moduledoc """
  Common helper functions for CKEditor5 components.
  """

  @doc """
  Assigns a unique ID if one is not already present in assigns.
  Generates a random UUID-based ID only when :id key is missing.
  """
  def assign_id_if_missing(assigns, prefix) do
    Phoenix.Component.assign_new(assigns, :id, fn ->
      uuid = :crypto.strong_rand_bytes(16) |> Base.encode16(case: :lower)
      "#{prefix}-#{uuid}"
    end)
  end

  @doc """
  Checks if a given version string is in semantic versioning format (e.g., "1.0.0").
  """
  def is_semver_version?(version) when is_binary(version) do
    String.match?(version, ~r/^\d+\.\d+\.\d+(-[a-zA-Z0-9-.]+)?$/)
  end

  @doc """
  Maps all keys in a map to strings.
  """
  def map_keys_to_strings(map) when is_map(map) do
    Enum.map(map, fn {key, value} ->
      {to_string(key), value}
    end)
    |> Map.new()
  end

  @doc """
  Serializes a map of styles into a CSS string.
  Converts a map of styles into a string suitable for inline CSS.
  Example: %{color: "red", "font-size": "16px"} becomes "color: red; font-size: 16px".
  """
  def serialize_styles_map(styles_map) when is_map(styles_map) do
    styles_map
    |> Enum.map_join("; ", fn {key, value} -> "#{key}: #{value}" end)
  end

  @doc """
  Parses a style string into a map.
  """
  def parse_style(nil), do: %{}

  def parse_style(style) when is_binary(style) do
    style
    |> String.split(";")
    |> Enum.map(&String.trim/1)
    |> Enum.reject(&(&1 == ""))
    |> Enum.reduce(%{}, fn rule, acc ->
      case String.split(rule, ":", parts: 2) do
        [key, value] -> Map.put(acc, String.trim(key), String.trim(value))
        _ -> acc
      end
    end)
  end

  def parse_style(style), do: style
end
