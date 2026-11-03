defmodule CKEditor5.License.ExtractorTest do
  use ExUnit.Case, async: true

  alias CKEditor5.Errors
  alias CKEditor5.License.Extractor
  alias CKEditor5.Test.LicenseGenerator

  describe "distribution_channel/1" do
    test "returns 'sh' for GPL license" do
      assert Extractor.distribution_channel("GPL") == {:ok, "sh"}
    end

    test "extracts distribution channel from a valid license key" do
      key = LicenseGenerator.generate_key("test-channel")
      assert Extractor.distribution_channel(key) == {:ok, "test-channel"}
    end

    test "returns nil when distributionChannel is missing" do
      key = build_key(%{"exp" => 1_900_000_000})
      assert Extractor.distribution_channel(key) == {:ok, nil}
    end

    test "returns nil when distributionChannel is null" do
      key = build_key(%{"distributionChannel" => nil})
      assert Extractor.distribution_channel(key) == {:ok, nil}
    end

    test "returns error for a key with invalid format" do
      key = "invalidkey"
      assert Extractor.distribution_channel(key) == {:error, %Errors.InvalidLicenseKey{key: key}}
    end

    test "returns error for a key with invalid base64 payload" do
      key = "header.invalid_payload.signature"
      assert Extractor.distribution_channel(key) == {:error, %Errors.InvalidLicenseKey{key: key}}
    end

    test "returns error for a key with invalid json payload" do
      payload = "invalid-json" |> Base.url_encode64(padding: false)
      key = "header.#{payload}.signature"
      assert Extractor.distribution_channel(key) == {:error, %Errors.InvalidLicenseKey{key: key}}
    end
  end

  describe "distribution_channel/1 with a list of channels" do
    test "returns 'cloud' when the list contains cloud" do
      key = build_key(%{"distributionChannel" => ["cloud"]})
      assert Extractor.distribution_channel(key) == {:ok, "cloud"}
    end

    test "returns 'sh' when the list contains sh" do
      key = build_key(%{"distributionChannel" => ["sh"]})
      assert Extractor.distribution_channel(key) == {:ok, "sh"}
    end

    test "returns nil (every distribution allowed) when the list contains both channels" do
      key = build_key(%{"distributionChannel" => ["sh", "drupal", "cloud"]})
      assert Extractor.distribution_channel(key) == {:ok, nil}
    end

    test "ignores unknown and non-string entries" do
      key = build_key(%{"distributionChannel" => ["drupal", 42, nil, "sh"]})
      assert Extractor.distribution_channel(key) == {:ok, "sh"}
    end

    test "returns error when the list contains no known channel" do
      key = build_key(%{"distributionChannel" => ["drupal", "unknown"]})
      assert Extractor.distribution_channel(key) == {:error, %Errors.InvalidLicenseKey{key: key}}
    end

    test "returns error for an empty list" do
      key = build_key(%{"distributionChannel" => []})
      assert Extractor.distribution_channel(key) == {:error, %Errors.InvalidLicenseKey{key: key}}
    end
  end

  describe "distribution_channel/1 with an unsupported channel type" do
    test "returns error for a number" do
      key = build_key(%{"distributionChannel" => 42})
      assert Extractor.distribution_channel(key) == {:error, %Errors.InvalidLicenseKey{key: key}}
    end

    test "returns error for a boolean" do
      key = build_key(%{"distributionChannel" => true})
      assert Extractor.distribution_channel(key) == {:error, %Errors.InvalidLicenseKey{key: key}}
    end

    test "returns error for an object" do
      key = build_key(%{"distributionChannel" => %{"channel" => "cloud"}})
      assert Extractor.distribution_channel(key) == {:error, %Errors.InvalidLicenseKey{key: key}}
    end
  end

  # Builds a JWT-shaped key with arbitrary claims, including non-string distributionChannel values.
  defp build_key(claims) do
    payload = claims |> Jason.encode!() |> Base.url_encode64(padding: false)
    "header.#{payload}.signature"
  end
end
